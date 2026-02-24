"""
RunPod Serverless Handler - AI Talk (ComfyUI InfiniteTalk/WanVideo)

Supports two modes:
  - TTS mode: text + voice_id -> ElevenlabsTextToSpeech (node 333) -> video
  - STS mode: audio + voice_id -> LoadAudio (900) -> ElevenLabsVoiceChanger (295) -> video

The handler loads a base workflow with BOTH nodes, then removes the
unused path before submitting to ComfyUI.
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

MAX_EXECUTION_TIME = 1800  # 30 minutes


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
# Audio helpers
# ---------------------------------------------------------------------------
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
    Inject user inputs and configure the workflow for TTS or STS mode.

    TTS mode (text selected):
      - Node 333 (ElevenlabsTextToSpeech) generates audio
      - Node 214 audio_1 = ["333", 0]
      - Remove STS nodes: 295, 900

    STS mode (audio selected):
      - Node 900 (LoadAudio) loads user audio
      - Node 295 (ElevenLabsVoiceChanger) transforms voice
      - Node 214 audio_1 = ["295", 0]
      - Remove TTS node: 333
    """
    mode = inputs.get("mode", "tts")

    # Remove _comment keys (not valid ComfyUI nodes)
    comment_keys = [k for k in workflow if k.startswith("_comment")]
    for k in comment_keys:
        del workflow[k]

    # --- Input image (Node 737) ---
    if inputs.get("input_image"):
        image_data = inputs["input_image"]
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        workflow["737"]["inputs"]["base64_data"] = image_data

    # --- Positive prompt (Node 225) ---
    if inputs.get("positive_prompt"):
        workflow["225"]["inputs"]["positive_prompt"] = inputs["positive_prompt"]

    # --- Audio routing based on mode ---
    if mode == "sts":
        print("[Workflow] STS mode: audio -> VoiceChanger (295) -> wav2vec (214)")

        # Save input audio to file
        audio_b64 = inputs.get("input_audio", "")
        if not audio_b64:
            raise ValueError("STS mode requires input_audio")

        audio_filename = f"sts_input_{uuid.uuid4().hex[:8]}.mp3"
        save_audio_to_comfyui_input(audio_b64, audio_filename)

        # Configure LoadAudio (900) -> VoiceChanger (295) -> wav2vec (214)
        workflow["900"]["inputs"]["audio"] = audio_filename

        if ELEVENLABS_API_KEY:
            workflow["295"]["inputs"]["api_key"] = ELEVENLABS_API_KEY
        if inputs.get("voice_id"):
            workflow["295"]["inputs"]["voice_id"] = inputs["voice_id"]

        workflow["214"]["inputs"]["audio_1"] = ["295", 0]

        # Remove TTS node (not needed, avoid execution)
        workflow.pop("333", None)

    else:
        print("[Workflow] TTS mode: text -> TTS (333) -> wav2vec (214)")

        # Configure TTS node (333)
        if ELEVENLABS_API_KEY:
            workflow["333"]["inputs"]["api_key"] = ELEVENLABS_API_KEY
        if inputs.get("voice_id"):
            workflow["333"]["inputs"]["voice_id"] = inputs["voice_id"]
        if inputs.get("input_text"):
            workflow["333"]["inputs"]["text"] = inputs["input_text"]

        workflow["214"]["inputs"]["audio_1"] = ["333", 0]

        # Remove STS nodes (not needed, avoid execution)
        workflow.pop("295", None)
        workflow.pop("900", None)

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

    # Check node 238 first (VHS_VideoCombine)
    if "238" in outputs:
        node_output = outputs["238"]
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
        "input_image": "base64",
        "input_audio": "base64" (STS mode),
        "input_text": "text" (TTS mode),
        "voice_id": "elevenlabs voice ID",
        "positive_prompt": "scene description",
        "mode": "tts" | "sts"
    }
    """
    start_time = time.time()
    job_input = job.get("input", {})
    mode = job_input.get("mode", "tts")

    print("=" * 60)
    print("  AI Talk Handler - New Job")
    print("=" * 60)
    print(f"  Mode: {mode}")
    print(f"  Voice ID: {job_input.get('voice_id', 'default')}")
    print(f"  Has image: {bool(job_input.get('input_image'))}")
    print(f"  Has audio: {bool(job_input.get('input_audio'))}")
    print(f"  Has text: {bool(job_input.get('input_text'))}")
    print(f"  Prompt: {str(job_input.get('positive_prompt', ''))[:100]}...")

    try:
        # 1. Load and prepare workflow
        print("\n[Step 1] Loading workflow...")
        workflow = load_workflow()

        print("[Step 2] Preparing workflow for mode:", mode)
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
