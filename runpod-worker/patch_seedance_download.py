"""
Build-time patch for comfyui-seedance-nodes/utils.py:download_video.

The upstream implementation does a single `requests.get(stream=True)` followed by
`iter_content(8192)`. If the Seedance CDN drops the connection mid-stream
(observed as `requests.exceptions.ChunkedEncodingError: IncompleteRead(...)`),
the whole ComfyUI prompt fails and the 10+ minutes of upstream video generation
that already happened are wasted.

This replaces the function with a retry+resume version. The patch matches the
original source exactly; if upstream changes, the build fails loudly so we know
to update the expected text instead of silently no-op'ing.
"""
from __future__ import annotations

import sys

UTILS_PATH = "/comfyui/custom_nodes/comfyui-seedance-nodes/utils.py"

# Exact upstream copy (theclueless-ai/comfyui-seedance-nodes). Note the unicode
# arrow in the print statement -- it is in the upstream file too.
OLD = '''def download_video(video_url: str, output_dir: str, prefix: str = "seedance") -> str:
    """
    Download a video from *video_url* and save it in *output_dir*.
    Returns the absolute path of the saved file.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = int(time.time())
    filename  = f"{prefix}_{timestamp}.mp4"
    filepath  = os.path.join(output_dir, filename)

    print(f"[Seedance] Downloading video → {filepath}")
    resp = requests.get(video_url, stream=True, timeout=120)
    resp.raise_for_status()

    with open(filepath, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"[Seedance] Video saved: {filepath}")
    return filepath'''

NEW = '''def download_video(video_url: str, output_dir: str, prefix: str = "seedance") -> str:
    """
    Download a video from *video_url* and save it in *output_dir*.
    Returns the absolute path of the saved file.

    Patched in app-comfydeploy/runpod-worker: retries on transient network
    errors and resumes via Range requests so a mid-download disconnect
    against the Seedance CDN doesn't waste the upstream generation time.
    """
    import time as _time
    from requests.exceptions import ChunkedEncodingError, ConnectionError, Timeout
    try:
        from urllib3.exceptions import IncompleteRead, ProtocolError
    except ImportError:
        IncompleteRead = ProtocolError = ()

    os.makedirs(output_dir, exist_ok=True)
    timestamp = int(time.time())
    filename  = f"{prefix}_{timestamp}.mp4"
    filepath  = os.path.join(output_dir, filename)

    print(f"[Seedance] Downloading video → {filepath}")

    transient = (ChunkedEncodingError, ConnectionError, Timeout,
                 IncompleteRead, ProtocolError)
    max_attempts = 5
    bytes_written = 0

    for attempt in range(1, max_attempts + 1):
        headers = {}
        if bytes_written > 0:
            headers["Range"] = f"bytes={bytes_written}-"
        try:
            resp = requests.get(video_url, stream=True, timeout=120, headers=headers)
            resp.raise_for_status()

            # If we asked for a Range but the server replied 200, it ignored
            # the header -- restart the file from scratch.
            if bytes_written > 0 and resp.status_code != 206:
                bytes_written = 0
                mode = "wb"
            else:
                mode = "ab" if bytes_written > 0 else "wb"

            with open(filepath, mode) as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if chunk:
                        f.write(chunk)
                        bytes_written += len(chunk)

            print(f"[Seedance] Video saved: {filepath} ({bytes_written} bytes)")
            return filepath

        except transient as e:
            if attempt == max_attempts:
                print(f"[Seedance] Download failed after {max_attempts} attempts: {e}")
                raise
            backoff = 2 ** (attempt - 1)
            print(
                f"[Seedance] Download failed (attempt {attempt}/{max_attempts}): "
                f"{type(e).__name__}: {e}. Retrying in {backoff}s "
                f"(have {bytes_written} bytes)..."
            )
            _time.sleep(backoff)

    raise RuntimeError("download_video: exhausted retries without success")'''


def main() -> int:
    with open(UTILS_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    if NEW.split("\n", 1)[0] in src and 'app-comfydeploy/runpod-worker' in src:
        print(f"[patch_seedance_download] Already patched: {UTILS_PATH}")
        return 0

    if OLD not in src:
        print(
            "[patch_seedance_download] ERROR: upstream download_video does not "
            "match the expected text. Pull the latest "
            "comfyui-seedance-nodes/utils.py and update OLD/NEW in "
            "runpod-worker/patch_seedance_download.py.",
            file=sys.stderr,
        )
        return 1

    with open(UTILS_PATH, "w", encoding="utf-8") as f:
        f.write(src.replace(OLD, NEW, 1))

    print(f"[patch_seedance_download] Patched {UTILS_PATH} with retry/resume download_video")
    return 0


if __name__ == "__main__":
    sys.exit(main())
