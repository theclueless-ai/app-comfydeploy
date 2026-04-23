"""
RunPod Serverless Handler - AI Talk (ComfyUI + Seedance 1.5 API)

All video generation runs through the Seedance external API. The local
ComfyUI graph only orchestrates: AudioCrop (up to 9 x 10 s slices) ->
WhisperX transcription/translation -> up to 9 chained Seedance calls ->
VideoConcat -> SaveVideo. Segments shorter than 4 s are skipped by the
Seed15_DurationGateVideo node, so any audio duration is accepted
(audio longer than 90 s is truncated by the crop window).

Node mapping:
  - Node 19  (LoadImage)                 : input character image
  - Node 21  (VHS_LoadAudioUpload)        : input audio
  - Node 100 (Text _O)                   : prompt prefix (woman)
  - Node 309 (StringConcatenate)         : prompt prefix (man)
  - Nodes 318-327 (SeedanceVideoGenerator): Seedance API calls (chained)
  - Node 237 (SaveVideo)                 : final output
"""

import runpod
import json
import os
import time
import uuid
import base64
import glob
import subprocess
import requests
import boto3

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_DIR = "/comfyui"
WORKFLOW_PATH = os.path.join(COMFYUI_DIR, "workflow_api.json")

S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")
S3_REGION = os.environ.get("AWS_S3_REGION", "us-east-1")
S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", None)
S3_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
S3_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

SEEDANCE_API_KEY = os.environ.get("SEEDANCE_API_KEY", "")

# The crop window in workflow_api.json ends at 1:30, so any extra audio
# is wasted Seedance generation. Reject longer clips up-front.
MAX_AUDIO_DURATION_S = 90.0

# 9 Seedance calls x up to 600 s each + WhisperX + concat.
MAX_EXECUTION_TIME = 6000

SEEDANCE_NODE_IDS = ["318", "320", "321", "322", "323", "324", "325", "326", "327"]


# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------
def get_s3_client():
    from botocore.config import Config
    kwargs = {
        "service_name": "s3",
        "region_name": S3_REGION,
        "aws_access_key_id": S3_ACCESS_KEY,
        "aws_secret_access_key": S3_SECRET_KEY,
        "config": Config(signature_version="s3v4"),
    }
    if S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
    return boto3.client(**kwargs)


def upload_to_s3(file_path: str, content_type: str = "video/mp4") -> str:
    s3 = get_s3_client()
    filename = os.path.basename(file_path)
    s3_key = f"ai-talk/{uuid.uuid4().hex[:8]}_{filename}"

    print(f"[S3] Uploading {file_path} -> s3://{S3_BUCKET}/{s3_key}")
    s3.upload_file(file_path, S3_BUCKET, s3_key, ExtraArgs={"ContentType": content_type})

    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": s3_key},
        ExpiresIn=7 * 24 * 3600,
    )
    print(f"[S3] Upload complete: {presigned_url[:80]}...")
    return presigned_url


# ---------------------------------------------------------------------------
# File helpers
# ---------------------------------------------------------------------------
def _strip_data_url_prefix(b64: str) -> str:
    return b64.split(",", 1)[1] if "," in b64 else b64


def save_image_to_comfyui_input(image_b64: str, filename: str) -> str:
    image_bytes = base64.b64decode(_strip_data_url_prefix(image_b64))
    input_dir = os.path.join(COMFYUI_DIR, "input")
    os.makedirs(input_dir, exist_ok=True)
    filepath = os.path.join(input_dir, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    print(f"[Image] Saved {len(image_bytes)} bytes to {filepath}")
    return filepath


def save_audio_to_comfyui_input(audio_b64: str, filename: str) -> str:
    audio_bytes = base64.b64decode(_strip_data_url_prefix(audio_b64))
    input_dir = os.path.join(COMFYUI_DIR, "input")
    os.makedirs(input_dir, exist_ok=True)
    filepath = os.path.join(input_dir, filename)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    print(f"[Audio] Saved {len(audio_bytes)} bytes to {filepath}")
    return filepath


def probe_audio_duration(filepath: str) -> float:
    """Return duration in seconds using ffprobe (bundled with ffmpeg)."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            filepath,
        ],
        capture_output=True, text=True, check=True,
    )
    return float(result.stdout.strip())


# ---------------------------------------------------------------------------
# Workflow preparation
# ---------------------------------------------------------------------------
def load_workflow() -> dict:
    with open(WORKFLOW_PATH, "r") as f:
        return json.load(f)


def prepare_workflow(workflow: dict, inputs: dict) -> dict:
    """
    Inject user inputs into the Seedance workflow.

    Required:
      - input_image (base64)   -> node 19
      - input_audio (base64)   -> node 21

    Optional:
      - prompt_prefix (str)    -> applied to BOTH node 100 (text) and node
                                  309 (string_a). Falls back to the values
                                  baked into the workflow JSON.
      - resolution (str)       -> nodes 318-327 resolution (default "1080p")
    """
    if not SEEDANCE_API_KEY:
        raise ValueError("SEEDANCE_API_KEY environment variable is not set")

    # --- Image (node 19) ---
    image_b64 = inputs.get("input_image", "")
    if not image_b64:
        raise ValueError("input_image is required")
    image_filename = f"input_{uuid.uuid4().hex[:8]}.png"
    save_image_to_comfyui_input(image_b64, image_filename)
    workflow["19"]["inputs"]["image"] = image_filename

    # --- Audio (node 21) + max-duration validation ---
    audio_b64 = inputs.get("input_audio", "")
    if not audio_b64:
        raise ValueError("input_audio is required")
    audio_filename = f"audio_{uuid.uuid4().hex[:8]}.mp3"
    audio_path = save_audio_to_comfyui_input(audio_b64, audio_filename)

    duration = probe_audio_duration(audio_path)
    print(f"[Audio] Duration: {duration:.2f}s")
    if duration > MAX_AUDIO_DURATION_S:
        raise ValueError(
            f"input_audio is {duration:.2f}s but the workflow accepts at "
            f"most {MAX_AUDIO_DURATION_S:.0f}s."
        )
    workflow["21"]["inputs"]["audio"] = audio_filename

    # --- Single prompt prefix applied to both nodes ---
    if "prompt_prefix" in inputs:
        prefix = inputs["prompt_prefix"]
        workflow["100"]["inputs"]["text"] = prefix
        workflow["309"]["inputs"]["string_a"] = prefix

    # --- Seedance nodes: inject API key + optional resolution override ---
    resolution = inputs.get("resolution")
    for node_id in SEEDANCE_NODE_IDS:
        node_inputs = workflow[node_id]["inputs"]
        node_inputs["api_key"] = SEEDANCE_API_KEY
        if resolution:
            node_inputs["resolution"] = resolution

    print(
        f"[Workflow] Prepared | image={image_filename} audio={audio_filename} "
        f"resolution={resolution or 'default'}"
    )
    return workflow


# ---------------------------------------------------------------------------
# ComfyUI interaction
# ---------------------------------------------------------------------------
def queue_prompt(workflow: dict) -> str:
    resp = requests.post(f"{COMFYUI_URL}/prompt", json={"prompt": workflow})
    resp.raise_for_status()
    prompt_id = resp.json()["prompt_id"]
    print(f"[ComfyUI] Queued prompt: {prompt_id}")
    return prompt_id


def poll_until_complete(prompt_id: str) -> dict:
    start_time = time.time()

    while True:
        elapsed = time.time() - start_time
        if elapsed > MAX_EXECUTION_TIME:
            raise TimeoutError(f"Workflow exceeded {MAX_EXECUTION_TIME}s timeout")

        try:
            resp = requests.get(f"{COMFYUI_URL}/history/{prompt_id}")
            resp.raise_for_status()
            history = resp.json()

            if prompt_id in history:
                entry = history[prompt_id]
                status = entry.get("status", {})

                if status.get("completed", False):
                    print(f"[ComfyUI] Prompt completed in {elapsed:.1f}s")
                    return entry

                if status.get("status_str") == "error":
                    error_msgs = []
                    for node_id, node_info in entry.get("outputs", {}).items():
                        if "errors" in node_info:
                            error_msgs.append(f"Node {node_id}: {node_info['errors']}")
                    raise RuntimeError(
                        f"Workflow failed: {'; '.join(error_msgs) or 'Unknown error'}"
                    )

        except requests.exceptions.ConnectionError:
            print(f"[ComfyUI] Connection error, retrying... ({elapsed:.0f}s)")

        time.sleep(2)

        if int(elapsed) % 30 == 0 and elapsed > 0:
            print(f"[ComfyUI] Still running... ({elapsed:.0f}s elapsed)")


def find_output_video(history_entry: dict) -> str | None:
    """
    Locate the final video produced by node 237 (SaveVideo,
    filename_prefix 'video/prueba final').
    """
    outputs = history_entry.get("outputs", {})

    # Primary: node 237 SaveVideo
    if "237" in outputs:
        node_output = outputs["237"]
        for key in ["videos", "gifs"]:
            for item in node_output.get(key, []):
                filename = item.get("filename", "")
                subfolder = item.get("subfolder", "")
                file_type = item.get("type", "output")
                base = "temp" if file_type == "temp" else "output"
                video_path = os.path.join(COMFYUI_DIR, base, subfolder, filename)
                if os.path.exists(video_path):
                    print(f"[Output] Found video: {video_path}")
                    return video_path

    # Fallback: any video output in history
    for node_id, node_output in outputs.items():
        for key in ["videos", "gifs"]:
            for item in node_output.get(key, []):
                filename = item.get("filename", "")
                subfolder = item.get("subfolder", "")
                video_path = os.path.join(COMFYUI_DIR, "output", subfolder, filename)
                if os.path.exists(video_path):
                    print(f"[Output] Found video (fallback): {video_path}")
                    return video_path

    # Last resort: most recent mp4 under output/video
    mp4_files = glob.glob(os.path.join(COMFYUI_DIR, "output", "**/*.mp4"), recursive=True)
    if mp4_files:
        latest = max(mp4_files, key=os.path.getmtime)
        print(f"[Output] Found video (glob): {latest}")
        return latest

    return None


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------
def handler(job: dict) -> dict:
    """
    RunPod serverless handler.

    Input:
    {
        "input_image": "base64",     -- required: character face
        "input_audio": "base64",     -- required: audio (mp3/wav)
        "prompt_prefix": "text",     -- optional: applied to both nodes 100 and 309
        "resolution": "1080p"        -- optional: Seedance resolution
    }
    """
    start_time = time.time()
    job_input = job.get("input", {})

    print("=" * 60)
    print("  AI Talk Handler - New Job (Seedance 1.5)")
    print("=" * 60)
    print(f"  Has image: {bool(job_input.get('input_image'))}")
    print(f"  Has audio: {bool(job_input.get('input_audio'))}")
    print(f"  Resolution override: {job_input.get('resolution', '-')}")

    try:
        print("\n[Step 1] Loading workflow...")
        workflow = load_workflow()

        print("[Step 2] Preparing workflow...")
        workflow = prepare_workflow(workflow, job_input)

        print("[Step 3] Queueing prompt in ComfyUI...")
        prompt_id = queue_prompt(workflow)

        print("[Step 4] Waiting for execution...")
        history_entry = poll_until_complete(prompt_id)

        print("[Step 5] Locating output video...")
        video_path = find_output_video(history_entry)
        if not video_path:
            raise RuntimeError("No video output found in ComfyUI results")

        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"  Video: {video_path} ({file_size_mb:.1f} MB)")

        print("[Step 6] Uploading to S3...")
        video_url = upload_to_s3(video_path, content_type="video/mp4")

        execution_time = time.time() - start_time

        print(f"\n{'=' * 60}")
        print(f"  Job complete! ({execution_time:.1f}s)")
        print(f"  Video URL: {video_url[:80]}...")
        print(f"{'=' * 60}")

        return {
            "video_url": video_url,
            "filename": os.path.basename(video_path),
            "execution_time_s": round(execution_time, 1),
            "file_size_mb": round(file_size_mb, 2),
        }

    except Exception as e:
        execution_time = time.time() - start_time
        print(f"\n[ERROR] Failed after {execution_time:.1f}s: {e}")
        raise


if __name__ == "__main__":
    print("Starting AI Talk RunPod handler (Seedance 1.5)...")
    runpod.serverless.start({"handler": handler})
