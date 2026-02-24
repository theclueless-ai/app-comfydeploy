"""
RunPod Serverless Handler - AI Talk (ComfyUI InfiniteTalk/WanVideo)

Receives inputs from the Next.js app, injects them into the ComfyUI workflow,
executes it, and uploads the resulting video to S3.

Supports two modes:
  - TTS mode: text + voice_id -> ElevenLabs TTS node in ComfyUI -> InfiniteTalk video
  - STS mode: audio + voice_id -> ElevenLabs STS API (handler) -> LoadAudio -> InfiniteTalk video
"""

import runpod
import json
import os
import time
import uuid
import base64
import glob
import tempfile
import requests
import boto3

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_DIR = "/comfyui"
WORKFLOW_PATH = os.path.join(COMFYUI_DIR, "workflow_api.json")

# S3 config (set via RunPod endpoint environment variables)
S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")
S3_REGION = os.environ.get("AWS_S3_REGION", "us-east-1")
S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", None)  # For R2/MinIO
S3_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
S3_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

# ElevenLabs API key (injected into workflow nodes + used for STS API)
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")

# Max wait time for a single workflow execution (30 minutes)
MAX_EXECUTION_TIME = 1800


# ---------------------------------------------------------------------------
# ElevenLabs Speech-to-Speech API (for STS mode)
# ---------------------------------------------------------------------------
def elevenlabs_speech_to_speech(
    audio_bytes: bytes,
    voice_id: str,
    model_id: str = "eleven_english_sts_v2",
    stability: float = 0.3,
    similarity_boost: float = 0.85,
    style: float = 0.3,
) -> bytes:
    """
    Call ElevenLabs Speech-to-Speech API.
    Takes raw audio bytes + voice_id, returns transformed audio bytes.
    """
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")

    url = f"https://api.elevenlabs.io/v1/speech-to-speech/{voice_id}"

    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
    }

    voice_settings = json.dumps({
        "stability": stability,
        "similarity_boost": similarity_boost,
        "style": style,
    })

    files = {
        "audio": ("input_audio.mp3", audio_bytes, "audio/mpeg"),
    }
    data = {
        "model_id": model_id,
        "voice_settings": voice_settings,
    }

    print(f"[ElevenLabs STS] Calling API for voice_id={voice_id}, model={model_id}")

    resp = requests.post(url, headers=headers, files=files, data=data)

    if resp.status_code != 200:
        raise RuntimeError(
            f"ElevenLabs STS API error: {resp.status_code} - {resp.text[:500]}"
        )

    print(f"[ElevenLabs STS] Got {len(resp.content)} bytes of audio")
    return resp.content


def decode_base64_audio(audio_data: str) -> bytes:
    """Decode base64 audio data (with or without data URI prefix)."""
    if "," in audio_data:
        audio_data = audio_data.split(",", 1)[1]
    return base64.b64decode(audio_data)


def save_audio_to_comfyui_input(audio_bytes: bytes, filename: str) -> str:
    """
    Save audio bytes to ComfyUI's input directory so LoadAudio can find it.
    Returns the filename (relative to input dir).
    """
    input_dir = os.path.join(COMFYUI_DIR, "input")
    os.makedirs(input_dir, exist_ok=True)
    filepath = os.path.join(input_dir, filename)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    print(f"[Audio] Saved {len(audio_bytes)} bytes to {filepath}")
    return filename


# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------
def get_s3_client():
    """Create boto3 S3 client."""
    kwargs = {
        "service_name": "s3",
        "region_name": S3_REGION,
        "aws_access_key_id": S3_ACCESS_KEY,
        "aws_secret_access_key": S3_SECRET_KEY,
    }
    if S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = S3_ENDPOINT_URL
    return boto3.client(**kwargs)


def upload_to_s3(file_path: str, content_type: str = "video/mp4") -> str:
    """Upload a file to S3 and return a presigned URL (valid 7 days)."""
    s3 = get_s3_client()
    filename = os.path.basename(file_path)
    s3_key = f"ai-talk/{uuid.uuid4().hex[:8]}_{filename}"

    print(f"[S3] Uploading {file_path} -> s3://{S3_BUCKET}/{s3_key}")

    s3.upload_file(
        file_path,
        S3_BUCKET,
        s3_key,
        ExtraArgs={"ContentType": content_type},
    )

    # Generate presigned URL (7 days)
    presigned_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": s3_key},
        ExpiresIn=7 * 24 * 3600,
    )

    print(f"[S3] Upload complete: {presigned_url[:80]}...")
    return presigned_url


# ---------------------------------------------------------------------------
# Workflow loading and input injection
# ---------------------------------------------------------------------------
def load_workflow() -> dict:
    """Load the base workflow JSON."""
    with open(WORKFLOW_PATH, "r") as f:
        return json.load(f)


def inject_inputs_tts(workflow: dict, inputs: dict) -> dict:
    """
    Inject inputs for TTS mode.
    Text + voice_id -> ElevenlabsTextToSpeech (node 250) -> audio -> video

    Node mapping:
      - 737: easy loadImageBase64 -> base64_data (input image)
      - 250: ElevenlabsTextToSpeech -> text, voice_id, api_key
      - 225: WanVideoTextEncodeCached -> positive_prompt
      - 214: MultiTalkWav2VecEmbeds -> audio_1 from node 250
    """
    # --- Input image (Node 737) ---
    if "input_image" in inputs:
        image_data = inputs["input_image"]
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        workflow["737"]["inputs"]["base64_data"] = image_data

    # --- ElevenLabs TTS node (Node 250) ---
    if ELEVENLABS_API_KEY:
        workflow["250"]["inputs"]["api_key"] = ELEVENLABS_API_KEY

    if inputs.get("voice_id"):
        workflow["250"]["inputs"]["voice_id"] = inputs["voice_id"]

    if inputs.get("input_text"):
        workflow["250"]["inputs"]["text"] = inputs["input_text"]

    # --- Positive prompt (Node 225) ---
    if inputs.get("positive_prompt"):
        workflow["225"]["inputs"]["positive_prompt"] = inputs["positive_prompt"]

    # Audio routing: node 214 audio_1 -> node 250 (TTS output)
    workflow["214"]["inputs"]["audio_1"] = ["250", 0]

    print("[Workflow] TTS mode: text -> node 250 (TTS) -> node 214 (wav2vec)")
    return workflow


def inject_inputs_sts(workflow: dict, inputs: dict, audio_filename: str) -> dict:
    """
    Inject inputs for STS mode.
    Audio file (already processed by ElevenLabs STS API) -> LoadAudio -> video

    Adds a LoadAudio node (node "900") to load the STS-processed audio,
    then rewires node 214 to use it instead of node 250 (TTS).
    """
    # --- Input image (Node 737) ---
    if "input_image" in inputs:
        image_data = inputs["input_image"]
        if "," in image_data:
            image_data = image_data.split(",", 1)[1]
        workflow["737"]["inputs"]["base64_data"] = image_data

    # --- Positive prompt (Node 225) ---
    if inputs.get("positive_prompt"):
        workflow["225"]["inputs"]["positive_prompt"] = inputs["positive_prompt"]

    # --- Remove TTS node (250) - not needed in STS mode ---
    if "250" in workflow:
        del workflow["250"]

    # --- Add LoadAudio node (node 900) ---
    workflow["900"] = {
        "inputs": {
            "audio": audio_filename,
        },
        "class_type": "LoadAudio",
        "_meta": {
            "title": "Load Audio (STS)"
        }
    }

    # --- Rewire node 214: audio_1 now comes from LoadAudio (900) ---
    workflow["214"]["inputs"]["audio_1"] = ["900", 0]

    # --- Inject API key into TTS node in case it's still referenced ---
    # (already deleted above, but just in case)

    print(f"[Workflow] STS mode: {audio_filename} -> node 900 (LoadAudio) -> node 214 (wav2vec)")
    return workflow


# ---------------------------------------------------------------------------
# ComfyUI interaction
# ---------------------------------------------------------------------------
def queue_prompt(workflow: dict) -> str:
    """Send workflow to ComfyUI and return the prompt_id."""
    payload = {"prompt": workflow}
    resp = requests.post(f"{COMFYUI_URL}/prompt", json=payload)
    resp.raise_for_status()
    data = resp.json()
    prompt_id = data["prompt_id"]
    print(f"[ComfyUI] Queued prompt: {prompt_id}")
    return prompt_id


def poll_until_complete(prompt_id: str) -> dict:
    """
    Poll ComfyUI /history endpoint until the prompt completes.
    Returns the history entry for the prompt.
    """
    start_time = time.time()

    while True:
        elapsed = time.time() - start_time
        if elapsed > MAX_EXECUTION_TIME:
            raise TimeoutError(
                f"Workflow execution exceeded {MAX_EXECUTION_TIME}s timeout"
            )

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
                            error_msgs.append(
                                f"Node {node_id}: {node_info['errors']}"
                            )
                    raise RuntimeError(
                        f"Workflow failed: {'; '.join(error_msgs) or 'Unknown error'}"
                    )

        except requests.exceptions.ConnectionError:
            print(f"[ComfyUI] Connection error, retrying... ({elapsed:.0f}s)")

        # Poll every 2 seconds
        time.sleep(2)

        if int(elapsed) % 30 == 0 and elapsed > 0:
            print(f"[ComfyUI] Still running... ({elapsed:.0f}s elapsed)")


def find_output_video(history_entry: dict) -> str | None:
    """
    Find the output video file from the ComfyUI history entry.
    Looks for VHS_VideoCombine output (Node 238).
    """
    outputs = history_entry.get("outputs", {})

    # Check node 238 first (VHS_VideoCombine)
    for node_id in ["238"]:
        if node_id in outputs:
            node_output = outputs[node_id]

            # VHS_VideoCombine outputs gifs array (which are actually videos)
            if "gifs" in node_output:
                for item in node_output["gifs"]:
                    filename = item.get("filename", "")
                    subfolder = item.get("subfolder", "")
                    file_type = item.get("type", "output")

                    if file_type == "temp":
                        video_path = os.path.join(
                            COMFYUI_DIR, "temp", subfolder, filename
                        )
                    else:
                        video_path = os.path.join(
                            COMFYUI_DIR, "output", subfolder, filename
                        )

                    if os.path.exists(video_path):
                        print(f"[Output] Found video: {video_path}")
                        return video_path

            # Also check videos array
            if "videos" in node_output:
                for item in node_output["videos"]:
                    filename = item.get("filename", "")
                    subfolder = item.get("subfolder", "")
                    video_path = os.path.join(
                        COMFYUI_DIR, "output", subfolder, filename
                    )
                    if os.path.exists(video_path):
                        print(f"[Output] Found video: {video_path}")
                        return video_path

    # Fallback: search all outputs for any video files
    for node_id, node_output in outputs.items():
        for key in ["gifs", "videos"]:
            if key in node_output:
                for item in node_output[key]:
                    filename = item.get("filename", "")
                    subfolder = item.get("subfolder", "")
                    video_path = os.path.join(
                        COMFYUI_DIR, "output", subfolder, filename
                    )
                    if os.path.exists(video_path):
                        print(f"[Output] Found video (fallback): {video_path}")
                        return video_path

    # Last resort: find most recent mp4 in output directory
    output_dir = os.path.join(COMFYUI_DIR, "output")
    mp4_files = glob.glob(os.path.join(output_dir, "**/*.mp4"), recursive=True)
    if mp4_files:
        latest = max(mp4_files, key=os.path.getmtime)
        print(f"[Output] Found video (glob fallback): {latest}")
        return latest

    return None


# ---------------------------------------------------------------------------
# Main handler
# ---------------------------------------------------------------------------
def handler(job: dict) -> dict:
    """
    RunPod serverless handler.

    Expected input:
    {
        "input_image": "base64 data URI or raw base64",
        "input_audio": "base64 data URI or raw base64" (for STS mode),
        "input_text": "text for TTS" (for TTS mode),
        "voice_id": "elevenlabs voice ID",
        "positive_prompt": "scene description for video generation",
        "mode": "tts" | "sts" (default "tts")
    }

    TTS mode: input_text -> ElevenlabsTextToSpeech node -> wav2vec -> video
    STS mode: input_audio -> ElevenLabs STS API -> LoadAudio node -> wav2vec -> video
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
        # 1. Load base workflow
        print("\n[Step 1] Loading workflow...")
        workflow = load_workflow()

        # 2. Process audio and inject inputs based on mode
        if mode == "sts":
            # --- STS MODE ---
            # a) Decode user's input audio from base64
            print("[Step 2] STS mode - processing audio...")
            input_audio = job_input.get("input_audio", "")
            if not input_audio:
                raise ValueError("STS mode requires input_audio")

            raw_audio = decode_base64_audio(input_audio)
            print(f"  Decoded input audio: {len(raw_audio)} bytes")

            # b) Call ElevenLabs Speech-to-Speech API
            voice_id = job_input.get("voice_id", "gdMFOufuI36UmxNKJhtv")
            sts_audio = elevenlabs_speech_to_speech(
                audio_bytes=raw_audio,
                voice_id=voice_id,
            )

            # c) Save STS audio to ComfyUI input directory
            audio_filename = f"sts_audio_{uuid.uuid4().hex[:8]}.mp3"
            save_audio_to_comfyui_input(sts_audio, audio_filename)

            # d) Inject inputs with STS routing
            workflow = inject_inputs_sts(workflow, job_input, audio_filename)

        else:
            # --- TTS MODE ---
            print("[Step 2] TTS mode - injecting inputs...")
            workflow = inject_inputs_tts(workflow, job_input)

        # 3. Queue prompt in ComfyUI
        print("[Step 3] Queueing prompt in ComfyUI...")
        prompt_id = queue_prompt(workflow)

        # 4. Wait for execution to complete (no 5-min timeout!)
        print("[Step 4] Waiting for execution...")
        history_entry = poll_until_complete(prompt_id)

        # 5. Find the output video
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

    except TimeoutError as e:
        execution_time = time.time() - start_time
        print(f"\n[ERROR] Timeout after {execution_time:.1f}s: {e}")
        raise

    except Exception as e:
        execution_time = time.time() - start_time
        print(f"\n[ERROR] Failed after {execution_time:.1f}s: {e}")
        raise


# ---------------------------------------------------------------------------
# Start RunPod serverless worker
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("Starting AI Talk RunPod handler...")
    runpod.serverless.start({"handler": handler})
