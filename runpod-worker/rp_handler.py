"""
RunPod Serverless Handler - AI Talk (ComfyUI LTX-2.3)

Accepts audio input with two routing options:
  - use_elevenlabs_vc=True (default): audio -> ElevenLabsVoiceChanger (node 408) -> video
  - use_elevenlabs_vc=False: audio bypasses Voice Changer -> goes directly into pipeline

Node mapping (new LTX-2.3 workflow):
  - Node 167 (LoadImage): input character image
  - Node 352 (PrimitiveStringMultiline): positive prompt
  - Node 372 (LoadAudio): input audio file
  - Node 408 (ElevenLabsVoiceChanger): voice conversion (optional, controlled by node 420)
  - Node 420 (ComfySwitchNode): bypass switch for ElevenLabs Voice Changer
      switch=True  -> on_true  -> uses node 408 output (ElevenLabs)
      switch=False -> on_false -> uses node 372 output (direct audio)
  - Node 140 (VHS_VideoCombine): video output
"""

import runpod
import json
import os
import time
import uuid
import base64
import glob
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

ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")

MAX_EXECUTION_TIME = 3600  # 30 minutes


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
def save_image_to_comfyui_input(image_b64: str, filename: str) -> str:
    """Decode base64 image and save to ComfyUI input directory."""
    image_data = image_b64
    if "," in image_data:
        image_data = image_data.split(",", 1)[1]
    image_bytes = base64.b64decode(image_data)

    input_dir = os.path.join(COMFYUI_DIR, "input")
    os.makedirs(input_dir, exist_ok=True)
    filepath = os.path.join(input_dir, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    print(f"[Image] Saved {len(image_bytes)} bytes to {filepath}")
    return filename


def save_audio_to_comfyui_input(audio_b64: str, filename: str) -> str:
    """Decode base64 audio and save to ComfyUI input directory."""
    audio_data = audio_b64
    if "," in audio_data:
        audio_data = audio_data.split(",", 1)[1]
    audio_bytes = base64.b64decode(audio_data)

    input_dir = os.path.join(COMFYUI_DIR, "input")
    os.makedirs(input_dir, exist_ok=True)
    filepath = os.path.join(input_dir, filename)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    print(f"[Audio] Saved {len(audio_bytes)} bytes to {filepath}")
    return filename


# ---------------------------------------------------------------------------
# Workflow loading + conditional routing
# ---------------------------------------------------------------------------
def load_workflow() -> dict:
    with open(WORKFLOW_PATH, "r") as f:
        return json.load(f)


def prepare_workflow(workflow: dict, inputs: dict) -> dict:
    """
    Inject user inputs into the LTX-2.3 workflow.

    Parameters:
      - input_image: base64 image for node 167 (LoadImage)
      - input_audio: base64 audio for node 372 (LoadAudio) — required
      - positive_prompt: text for node 352 (PrimitiveStringMultiline)
      - voice_id: ElevenLabs voice ID for node 408 (only used when use_elevenlabs_vc=True)
      - use_elevenlabs_vc: bool (default True)
          True  -> node 420 switch=True  -> audio goes through ElevenLabs Voice Changer (408)
          False -> node 420 switch=False -> audio bypasses Voice Changer, goes directly
    """
    use_elevenlabs_vc = inputs.get("use_elevenlabs_vc", True)

    # Remove _comment keys (not valid ComfyUI nodes)
    comment_keys = [k for k in workflow if k.startswith("_comment")]
    for k in comment_keys:
        del workflow[k]

    # --- Input image (Node 167 - LoadImage) ---
    if inputs.get("input_image"):
        image_filename = f"input_{uuid.uuid4().hex[:8]}.png"
        save_image_to_comfyui_input(inputs["input_image"], image_filename)
        workflow["167"]["inputs"]["image"] = image_filename

    # --- Input audio (Node 372 - LoadAudio) ---
    audio_b64 = inputs.get("input_audio", "")
    if not audio_b64:
        raise ValueError("input_audio is required")

    audio_filename = f"audio_{uuid.uuid4().hex[:8]}.mp3"
    save_audio_to_comfyui_input(audio_b64, audio_filename)
    workflow["372"]["inputs"]["audio"] = audio_filename
    workflow["372"]["inputs"]["audioUI"] = (
        f"/api/view?filename={audio_filename}&type=input&subfolder=&rand=0.5"
    )

    # --- Positive prompt (Node 352 - PrimitiveStringMultiline) ---
    if inputs.get("positive_prompt"):
        workflow["352"]["inputs"]["value"] = inputs["positive_prompt"]

    # --- ElevenLabs Voice Changer (Node 408) ---
    voice_id = inputs.get("voice_id", "JBFqnCBsd6RMkjVDRZzb")
    workflow["408"]["inputs"]["voice_id"] = voice_id
    if ELEVENLABS_API_KEY:
        workflow["408"]["inputs"]["api_key"] = ELEVENLABS_API_KEY

    # --- ElevenLabs bypass switch (Node 420) ---
    # switch=True  -> on_true  -> node 408 (ElevenLabs Voice Changer)
    # switch=False -> on_false -> node 372 (direct audio, bypass ElevenLabs)
    workflow["420"]["inputs"]["switch"] = bool(use_elevenlabs_vc)

    if use_elevenlabs_vc:
        print(f"[Workflow] Audio -> ElevenLabs Voice Changer (voice_id={voice_id}) -> pipeline")
    else:
        print("[Workflow] Audio -> direct (bypassing ElevenLabs Voice Changer) -> pipeline")

    return workflow


# ---------------------------------------------------------------------------
# ComfyUI interaction
# ---------------------------------------------------------------------------
def queue_prompt(workflow: dict) -> str:
    payload = {"prompt": workflow}
    resp = requests.post(f"{COMFYUI_URL}/prompt", json=payload)
    resp.raise_for_status()
    data = resp.json()
    prompt_id = data["prompt_id"]
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
    outputs = history_entry.get("outputs", {})

    # Check node 140 first (VHS_VideoCombine - LTX-2.3 workflow)
    for node_id in ["140", "338", "238"]:
        if node_id in outputs:
            node_output = outputs[node_id]
            for key in ["gifs", "videos"]:
                if key in node_output:
                    for item in node_output[key]:
                        filename = item.get("filename", "")
                        subfolder = item.get("subfolder", "")
                        file_type = item.get("type", "output")

                        base = "temp" if file_type == "temp" else "output"
                        video_path = os.path.join(COMFYUI_DIR, base, subfolder, filename)

                        if os.path.exists(video_path):
                            print(f"[Output] Found video: {video_path}")
                            return video_path

    # Fallback: search all outputs
    for node_id, node_output in outputs.items():
        for key in ["gifs", "videos"]:
            if key in node_output:
                for item in node_output[key]:
                    filename = item.get("filename", "")
                    subfolder = item.get("subfolder", "")
                    video_path = os.path.join(COMFYUI_DIR, "output", subfolder, filename)
                    if os.path.exists(video_path):
                        print(f"[Output] Found video (fallback): {video_path}")
                        return video_path

    # Last resort: most recent mp4
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
        "input_image": "base64",          -- required: character image
        "input_audio": "base64",          -- required: audio to drive the video
        "positive_prompt": "text",        -- required: scene/motion description
        "voice_id": "elevenlabs_voice_id",-- optional: ElevenLabs voice (default: JBFqnCBsd6RMkjVDRZzb)
        "use_elevenlabs_vc": true/false   -- optional (default true):
                                             true  = audio goes through ElevenLabs Voice Changer
                                             false = audio bypasses Voice Changer (pre-generated audio)
    }
    """
    start_time = time.time()
    job_input = job.get("input", {})
    use_elevenlabs_vc = job_input.get("use_elevenlabs_vc", True)

    print("=" * 60)
    print("  AI Talk Handler - New Job (LTX-2.3)")
    print("=" * 60)
    print(f"  ElevenLabs VC: {use_elevenlabs_vc}")
    print(f"  Voice ID: {job_input.get('voice_id', 'default')}")
    print(f"  Has image: {bool(job_input.get('input_image'))}")
    print(f"  Has audio: {bool(job_input.get('input_audio'))}")
    print(f"  Prompt: {str(job_input.get('positive_prompt', ''))[:100]}...")

    try:
        # 1. Load and prepare workflow
        print("\n[Step 1] Loading workflow...")
        workflow = load_workflow()

        print("[Step 2] Preparing workflow...")
        workflow = prepare_workflow(workflow, job_input)

        # 3. Queue prompt
        print("[Step 3] Queueing prompt in ComfyUI...")
        prompt_id = queue_prompt(workflow)

        # 4. Wait for completion
        print("[Step 4] Waiting for execution...")
        history_entry = poll_until_complete(prompt_id)

        # 5. Find output video
        print("[Step 5] Locating output video...")
        video_path = find_output_video(history_entry)

        if not video_path:
            raise RuntimeError("No video output found in ComfyUI results")

        file_size_mb = os.path.getsize(video_path) / (1024 * 1024)
        print(f"  Video: {video_path} ({file_size_mb:.1f} MB)")

        # 6. Upload to S3
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
    print("Starting AI Talk RunPod handler...")
    runpod.serverless.start({"handler": handler})
