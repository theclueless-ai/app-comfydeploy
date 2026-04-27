"""
RunPod Serverless Handler for Vellum Workflows (piel, edad, makeup, pecas, pelo, orbital).

Receives a job with:
  - image: raw base64 string (no data URI prefix)
  - scaleFactor: 1 (4K) or 2 (8K)
  - workflow_type: "piel" | "edad" | "makeup" | "pecas" | "pelo" | "orbital"

  Makeup-specific extra fields:
  - makeup_ref: raw base64 string (makeup reference image)

  Pelo-specific extra fields:
  - pelo_ref: raw base64 string (hair reference image)

  Orbital-specific extra fields:
  - horizontal_select: 1-9 (camera horizontal angle)
  - vertical_select:   1-9 (camera vertical tilt)
  - zoom_select:       1-3 (close-up / normal / wide)

Injects parameters into the ComfyUI workflow, executes it,
uploads the output image to S3, and returns a presigned URL.
"""

import runpod
import json
import uuid
import os
import time
import base64
import glob as glob_module
import requests
import boto3
from botocore.config import Config
from io import BytesIO

# =============================================================================
# CONFIGURATION
# =============================================================================

COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_INPUT_DIR = "/comfyui/input"
COMFYUI_OUTPUT_DIR = "/comfyui/output"

WORKFLOWS_DIR = "/workflows"
WORKFLOW_FILES = {
    "piel":            os.path.join(WORKFLOWS_DIR, "vellum-piel.json"),
    "edad":            os.path.join(WORKFLOWS_DIR, "vellum-edad.json"),
    "makeup":          os.path.join(WORKFLOWS_DIR, "vellum-makeup.json"),
    "pecas":           os.path.join(WORKFLOWS_DIR, "vellum-pecas.json"),
    "pelo":            os.path.join(WORKFLOWS_DIR, "vellum-pelo.json"),
    "orbital":         os.path.join(WORKFLOWS_DIR, "vellum-orbital.json"),
    "video-translate": os.path.join(WORKFLOWS_DIR, "video-translate.json"),
}

# S3 configuration (from RunPod env vars)
S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")
S3_REGION = os.environ.get("AWS_S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
S3_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", None)

# ComfyUI API key for API nodes (ByteDanceSeedreamNode, etc.)
COMFYUI_API_KEY = os.environ.get("COMFYUI_API_KEY", "")

# Timeout for workflow execution (minutes)
EXECUTION_TIMEOUT = 60

# Node IDs that are consistent across piel/edad/makeup/pecas workflows
NODE_LOAD_IMAGE = "32"       # LoadImage node (main image)
NODE_SCALE_SELECTOR = "261"  # INTConstant: 1=4K, 2=8K
NODE_SAVE_IMAGE = "254"      # SaveImage output node

# Workflow-specific node IDs (piel/edad/makeup/pecas/pelo)
NODE_OPTION_SWITCH = "268"   # ImpactSwitch: edad (1-6) / pecas (1-3)
NODE_MAKEUP_REF = "264"      # LoadImage: makeup reference image
NODE_PELO_REF = "264"        # LoadImage: hair reference image (same node ID as makeup)

# Orbital workflow node IDs
ORBITAL_LOAD_IMAGE_B64 = "400"  # easy loadImageBase64: injects raw base64 directly
ORBITAL_SCALE_SELECTOR = "366"  # INTConstant: 1=4K, 2=8K
ORBITAL_HORIZONTAL = "308"      # ImpactSwitch: horizontal angle (1-9)
ORBITAL_VERTICAL = "310"        # ImpactSwitch: vertical angle (1-9)
ORBITAL_ZOOM = "293"            # ImpactSwitch: zoom level (1-3)

# Video Translate workflow node IDs
VIDEO_TRANSLATE_LOAD_VIDEO = "82"  # VHS_LoadVideo: video filename in ComfyUI input dir
VIDEO_TRANSLATE_LOAD_AUDIO = "89"  # LoadAudio: audio filename in ComfyUI input dir
VIDEO_TRANSLATE_SWITCH = "88"      # ComfySwitchNode: false=video (82), true=audio (89)
VIDEO_TRANSLATE_SAVE_AUDIO = "33"  # SaveAudio: output audio node (filename_prefix="audio/ComfyUI")

# Audio file extensions we may get from SaveAudio (ComfyUI defaults to .flac)
AUDIO_EXTS = (".flac", ".wav", ".mp3", ".ogg", ".m4a")


# =============================================================================
# S3 CLIENT
# =============================================================================

def get_s3_client():
    """Create a boto3 S3 client with the configured credentials."""
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


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def load_workflow(workflow_type: str) -> dict:
    """Load and return the workflow JSON for the given type."""
    path = WORKFLOW_FILES.get(workflow_type)
    if not path:
        raise ValueError(f"Unknown workflow_type: {workflow_type}. "
                         f"Valid: {list(WORKFLOW_FILES.keys())}")
    with open(path, "r") as f:
        return json.load(f)


def save_image_to_input(image_base64: str, filename: str) -> str:
    """
    Decode a base64 image and save it to the ComfyUI input directory.
    Returns the filename (not the full path) for use in LoadImage node.
    """
    image_data = base64.b64decode(image_base64)
    filepath = os.path.join(COMFYUI_INPUT_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_data)
    print(f"[handler] Saved input image: {filepath} ({len(image_data)} bytes)")
    return filename


def download_s3_key_to_input(s3_key: str, filename: str) -> str:
    """
    Stream an object from S3 directly into the ComfyUI input directory.
    Used by video-translate so the browser can upload large files (up to
    10 GB) directly to S3 instead of going through the Next.js server.
    Returns the filename (not the full path) for the LoadVideo / LoadAudio node.
    """
    if not S3_BUCKET or not S3_ACCESS_KEY:
        raise RuntimeError(
            "S3 credentials not configured. "
            "Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY"
        )

    s3 = get_s3_client()
    filepath = os.path.join(COMFYUI_INPUT_DIR, filename)
    print(f"[handler] Downloading s3://{S3_BUCKET}/{s3_key} -> {filepath}")
    s3.download_file(S3_BUCKET, s3_key, filepath)
    size = os.path.getsize(filepath)
    print(f"[handler] Download complete: {filepath} ({size / 1024 / 1024:.1f} MB)")
    return filename


def delete_s3_key(s3_key: str) -> None:
    """Best-effort delete of an upload object after the worker is done with it."""
    try:
        s3 = get_s3_client()
        s3.delete_object(Bucket=S3_BUCKET, Key=s3_key)
        print(f"[handler] Deleted input object: s3://{S3_BUCKET}/{s3_key}")
    except Exception as e:
        print(f"[handler] WARNING: failed to delete input object {s3_key}: {e}")


def prepare_workflow(
    workflow: dict,
    image_filename: str,
    scale_factor: int,
    workflow_type: str,
    extra_params: dict,
) -> dict:
    """
    Inject user inputs into the workflow.

    For piel/edad/makeup/pecas/pelo:
      - Node 32  (LoadImage):   image filename
      - Node 261 (INTConstant): scale value (1=4K, 2=8K)
      - Node 268 (ImpactSwitch): edad (1-6) / pecas (1-3)
      - Node 264 (LoadImage):   makeup or hair (pelo) reference filename

    For orbital:
      - Node 400 (easy loadImageBase64): raw base64 injected into base64_data
      - Node 366 (INTConstant): scale value (1=4K, 2=8K)
      - Node 308 (ImpactSwitch): horizontal angle (1-9)
      - Node 310 (ImpactSwitch): vertical angle (1-9)
      - Node 293 (ImpactSwitch): zoom level (1-3)
    """
    if workflow_type == "video-translate":
        # Video Translate routes the audio source through ComfySwitchNode (node 88):
        #   switch=False -> uses VHS_LoadVideo (node 82) audio output
        #   switch=True  -> uses LoadAudio (node 89) audio output
        media_type = extra_params.get("media_type", "video")

        if VIDEO_TRANSLATE_SWITCH not in workflow:
            raise ValueError(
                f"Node {VIDEO_TRANSLATE_SWITCH} (ComfySwitchNode) not found in video-translate workflow"
            )

        if media_type == "audio":
            audio_filename = extra_params.get("audio_filename")
            if not audio_filename:
                raise ValueError("video-translate (audio) workflow requires an audio filename")
            if VIDEO_TRANSLATE_LOAD_AUDIO not in workflow:
                raise ValueError(
                    f"Node {VIDEO_TRANSLATE_LOAD_AUDIO} (LoadAudio) not found in video-translate workflow"
                )
            workflow[VIDEO_TRANSLATE_LOAD_AUDIO]["inputs"]["audio"] = audio_filename
            workflow[VIDEO_TRANSLATE_SWITCH]["inputs"]["switch"] = True
            print(f"[handler] Injected audio '{audio_filename}' into node {VIDEO_TRANSLATE_LOAD_AUDIO}, switch=True")
        else:
            video_filename = extra_params.get("video_filename")
            if not video_filename:
                raise ValueError("video-translate (video) workflow requires a video filename")
            if VIDEO_TRANSLATE_LOAD_VIDEO not in workflow:
                raise ValueError(
                    f"Node {VIDEO_TRANSLATE_LOAD_VIDEO} (VHS_LoadVideo) not found in video-translate workflow"
                )
            workflow[VIDEO_TRANSLATE_LOAD_VIDEO]["inputs"]["video"] = video_filename
            workflow[VIDEO_TRANSLATE_SWITCH]["inputs"]["switch"] = False
            print(f"[handler] Injected video '{video_filename}' into node {VIDEO_TRANSLATE_LOAD_VIDEO}, switch=False")

        return workflow

    if workflow_type == "orbital":
        # Orbital uses "easy loadImageBase64" (node 400) — inject raw base64
        # directly into base64_data; no file path needed.
        image_base64 = extra_params.get("image_base64", "")
        if ORBITAL_LOAD_IMAGE_B64 in workflow:
            workflow[ORBITAL_LOAD_IMAGE_B64]["inputs"]["base64_data"] = image_base64
            print(f"[handler] Injected base64 image ({len(image_base64)} chars) into node {ORBITAL_LOAD_IMAGE_B64}")
        else:
            raise ValueError(f"Node {ORBITAL_LOAD_IMAGE_B64} (easy loadImageBase64) not found in orbital workflow")

        # Inject scale factor
        if ORBITAL_SCALE_SELECTOR in workflow:
            workflow[ORBITAL_SCALE_SELECTOR]["inputs"]["value"] = scale_factor
            print(f"[handler] Injected scaleFactor={scale_factor} into node {ORBITAL_SCALE_SELECTOR}")
        else:
            raise ValueError(f"Node {ORBITAL_SCALE_SELECTOR} (INTConstant) not found in orbital workflow")

        # Inject horizontal angle
        horizontal_select = extra_params.get("horizontal_select", 5)
        if ORBITAL_HORIZONTAL in workflow:
            workflow[ORBITAL_HORIZONTAL]["inputs"]["select"] = int(horizontal_select)
            print(f"[handler] Injected horizontal_select={horizontal_select} into node {ORBITAL_HORIZONTAL}")
        else:
            raise ValueError(f"Node {ORBITAL_HORIZONTAL} (ImpactSwitch) not found in orbital workflow")

        # Inject vertical angle
        vertical_select = extra_params.get("vertical_select", 5)
        if ORBITAL_VERTICAL in workflow:
            workflow[ORBITAL_VERTICAL]["inputs"]["select"] = int(vertical_select)
            print(f"[handler] Injected vertical_select={vertical_select} into node {ORBITAL_VERTICAL}")
        else:
            raise ValueError(f"Node {ORBITAL_VERTICAL} (ImpactSwitch) not found in orbital workflow")

        # Inject zoom level
        zoom_select = extra_params.get("zoom_select", 2)
        if ORBITAL_ZOOM in workflow:
            workflow[ORBITAL_ZOOM]["inputs"]["select"] = int(zoom_select)
            print(f"[handler] Injected zoom_select={zoom_select} into node {ORBITAL_ZOOM}")
        else:
            raise ValueError(f"Node {ORBITAL_ZOOM} (ImpactSwitch) not found in orbital workflow")

        return workflow

    # --- piel / edad / makeup / pecas / pelo ---

    # Inject main image
    if NODE_LOAD_IMAGE in workflow:
        workflow[NODE_LOAD_IMAGE]["inputs"]["image"] = image_filename
        print(f"[handler] Injected image '{image_filename}' into node {NODE_LOAD_IMAGE}")
    else:
        raise ValueError(f"Node {NODE_LOAD_IMAGE} (LoadImage) not found in workflow")

    # Inject scale factor
    if NODE_SCALE_SELECTOR in workflow:
        workflow[NODE_SCALE_SELECTOR]["inputs"]["value"] = scale_factor
        print(f"[handler] Injected scaleFactor={scale_factor} into node {NODE_SCALE_SELECTOR}")
    else:
        raise ValueError(f"Node {NODE_SCALE_SELECTOR} (INTConstant) not found in workflow")

    # Workflow-specific injections
    if workflow_type == "edad":
        age_select = extra_params.get("age_select", 3)
        if NODE_OPTION_SWITCH in workflow:
            workflow[NODE_OPTION_SWITCH]["inputs"]["select"] = int(age_select)
            print(f"[handler] Injected age_select={age_select} into node {NODE_OPTION_SWITCH}")
        else:
            raise ValueError(f"Node {NODE_OPTION_SWITCH} (ImpactSwitch) not found in edad workflow")

    elif workflow_type == "makeup":
        makeup_filename = extra_params.get("makeup_filename")
        if makeup_filename and NODE_MAKEUP_REF in workflow:
            workflow[NODE_MAKEUP_REF]["inputs"]["image"] = makeup_filename
            print(f"[handler] Injected makeup ref '{makeup_filename}' into node {NODE_MAKEUP_REF}")
        elif NODE_MAKEUP_REF not in workflow:
            raise ValueError(f"Node {NODE_MAKEUP_REF} (LoadImage) not found in makeup workflow")

    elif workflow_type == "pecas":
        freckle_select = extra_params.get("freckle_select", 1)
        if NODE_OPTION_SWITCH in workflow:
            workflow[NODE_OPTION_SWITCH]["inputs"]["select"] = int(freckle_select)
            print(f"[handler] Injected freckle_select={freckle_select} into node {NODE_OPTION_SWITCH}")
        else:
            raise ValueError(f"Node {NODE_OPTION_SWITCH} (ImpactSwitch) not found in pecas workflow")

    elif workflow_type == "pelo":
        pelo_filename = extra_params.get("pelo_filename")
        if pelo_filename and NODE_PELO_REF in workflow:
            workflow[NODE_PELO_REF]["inputs"]["image"] = pelo_filename
            print(f"[handler] Injected pelo ref '{pelo_filename}' into node {NODE_PELO_REF}")
        elif NODE_PELO_REF not in workflow:
            raise ValueError(f"Node {NODE_PELO_REF} (LoadImage) not found in pelo workflow")

    return workflow


def queue_prompt(workflow: dict) -> str:
    """
    Submit the workflow to ComfyUI's /prompt endpoint.
    Returns the prompt_id for tracking.
    """
    payload = {"prompt": workflow}
    if COMFYUI_API_KEY:
        payload["extra_data"] = {"api_key_comfy_org": COMFYUI_API_KEY}
    response = requests.post(f"{COMFYUI_URL}/prompt", json=payload, timeout=30)
    response.raise_for_status()
    result = response.json()
    prompt_id = result.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"No prompt_id in response: {result}")
    print(f"[handler] Queued prompt: {prompt_id}")
    return prompt_id


def poll_until_complete(prompt_id: str, timeout_minutes: int = EXECUTION_TIMEOUT) -> dict:
    """
    Poll ComfyUI /history/{prompt_id} until the workflow completes or fails.
    Returns the history entry for the prompt.
    """
    deadline = time.time() + (timeout_minutes * 60)
    poll_interval = 2  # seconds

    while time.time() < deadline:
        try:
            response = requests.get(
                f"{COMFYUI_URL}/history/{prompt_id}", timeout=10
            )
            if response.status_code == 200:
                history = response.json()
                if prompt_id in history:
                    entry = history[prompt_id]
                    status = entry.get("status", {})

                    if status.get("completed", False):
                        print(f"[handler] Workflow completed successfully")
                        return entry

                    if status.get("status_str") == "error":
                        error_msg = status.get("messages", "Unknown error")
                        raise RuntimeError(f"Workflow failed: {error_msg}")
        except requests.RequestException as e:
            print(f"[handler] Poll request error (retrying): {e}")

        time.sleep(poll_interval)

    raise TimeoutError(f"Workflow did not complete within {timeout_minutes} minutes")


def find_output_images(history_entry: dict) -> list:
    """
    Extract output image filenames from the ComfyUI history entry.
    Looks in the outputs of the SaveImage node.
    """
    outputs = history_entry.get("outputs", {})
    images = []

    # Check the known SaveImage node first
    if NODE_SAVE_IMAGE in outputs:
        node_output = outputs[NODE_SAVE_IMAGE]
        if "images" in node_output:
            for img in node_output["images"]:
                filename = img.get("filename")
                subfolder = img.get("subfolder", "")
                img_type = img.get("type", "output")
                if filename:
                    if subfolder:
                        filepath = os.path.join(COMFYUI_OUTPUT_DIR, subfolder, filename)
                    else:
                        filepath = os.path.join(COMFYUI_OUTPUT_DIR, filename)
                    images.append(filepath)

    # Fallback: search all output nodes for images
    if not images:
        for node_id, node_output in outputs.items():
            if "images" in node_output:
                for img in node_output["images"]:
                    filename = img.get("filename")
                    subfolder = img.get("subfolder", "")
                    if filename:
                        if subfolder:
                            filepath = os.path.join(COMFYUI_OUTPUT_DIR, subfolder, filename)
                        else:
                            filepath = os.path.join(COMFYUI_OUTPUT_DIR, filename)
                        images.append(filepath)

    # Last resort: find newest images in output dir
    if not images:
        print("[handler] No images found in history, scanning output directory...")
        pattern = os.path.join(COMFYUI_OUTPUT_DIR, "**", "*.png")
        all_images = sorted(glob_module.glob(pattern, recursive=True),
                            key=os.path.getmtime, reverse=True)
        if all_images:
            images.append(all_images[0])

    print(f"[handler] Found {len(images)} output image(s)")
    return images


def find_output_audios(history_entry: dict) -> list:
    """
    Extract output audio filepaths from a ComfyUI history entry.
    SaveAudio emits 'audio' entries (sometimes 'gifs' or 'audios' depending
    on the implementation); fall back to scanning the output dir for the
    newest audio file matching AUDIO_EXTS.
    """
    outputs = history_entry.get("outputs", {})
    audios = []

    def _collect(entries):
        for entry in entries:
            filename = entry.get("filename")
            subfolder = entry.get("subfolder", "")
            if not filename:
                continue
            if subfolder:
                audios.append(os.path.join(COMFYUI_OUTPUT_DIR, subfolder, filename))
            else:
                audios.append(os.path.join(COMFYUI_OUTPUT_DIR, filename))

    if VIDEO_TRANSLATE_SAVE_AUDIO in outputs:
        node_output = outputs[VIDEO_TRANSLATE_SAVE_AUDIO]
        for key in ("audio", "audios", "ui"):
            if key in node_output and isinstance(node_output[key], list):
                _collect(node_output[key])

    if not audios:
        for _, node_output in outputs.items():
            for key in ("audio", "audios"):
                if key in node_output and isinstance(node_output[key], list):
                    _collect(node_output[key])

    if not audios:
        print("[handler] No audio in history, scanning output directory...")
        all_audio = []
        for ext in AUDIO_EXTS:
            pattern = os.path.join(COMFYUI_OUTPUT_DIR, "**", f"*{ext}")
            all_audio.extend(glob_module.glob(pattern, recursive=True))
        all_audio = sorted(all_audio, key=os.path.getmtime, reverse=True)
        if all_audio:
            audios.append(all_audio[0])

    print(f"[handler] Found {len(audios)} output audio file(s)")
    return audios


def upload_audio_to_s3(filepath: str, workflow_type: str) -> dict:
    """
    Upload an audio file to S3 and return info with a presigned URL.
    """
    if not S3_BUCKET or not S3_ACCESS_KEY:
        raise RuntimeError("S3 credentials not configured. "
                           "Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")

    s3 = get_s3_client()
    filename = os.path.basename(filepath)
    ext = os.path.splitext(filename)[1].lower() or ".flac"
    content_types = {
        ".flac": "audio/flac",
        ".wav":  "audio/wav",
        ".mp3":  "audio/mpeg",
        ".ogg":  "audio/ogg",
        ".m4a":  "audio/mp4",
    }
    content_type = content_types.get(ext, "audio/flac")
    s3_key = f"{workflow_type}/{uuid.uuid4().hex[:8]}_{filename}"
    file_size = os.path.getsize(filepath)

    print(f"[handler] Uploading audio to S3: {s3_key} ({file_size / 1024 / 1024:.2f} MB)")

    with open(filepath, "rb") as f:
        s3.upload_fileobj(
            f, S3_BUCKET, s3_key,
            ExtraArgs={"ContentType": content_type}
        )

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": s3_key},
        ExpiresIn=7 * 24 * 3600,
    )

    print(f"[handler] Upload complete: {s3_key}")
    return {
        "url": url,
        "filename": filename,
        "file_size_mb": round(file_size / 1024 / 1024, 2),
    }


def upload_to_s3(filepath: str, workflow_type: str) -> dict:
    """
    Upload an image file to S3 and return info with a presigned URL.
    """
    if not S3_BUCKET or not S3_ACCESS_KEY:
        raise RuntimeError("S3 credentials not configured. "
                           "Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")

    s3 = get_s3_client()
    filename = os.path.basename(filepath)
    s3_key = f"vellum-{workflow_type}/{uuid.uuid4().hex[:8]}_{filename}"
    file_size = os.path.getsize(filepath)

    print(f"[handler] Uploading to S3: {s3_key} ({file_size / 1024 / 1024:.1f} MB)")

    with open(filepath, "rb") as f:
        s3.upload_fileobj(
            f, S3_BUCKET, s3_key,
            ExtraArgs={"ContentType": "image/png"}
        )

    # Generate presigned URL (7 days)
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": S3_BUCKET, "Key": s3_key},
        ExpiresIn=7 * 24 * 3600,
    )

    print(f"[handler] Upload complete: {s3_key}")
    return {
        "url": url,
        "filename": filename,
        "file_size_mb": round(file_size / 1024 / 1024, 2),
    }


# =============================================================================
# MAIN HANDLER
# =============================================================================

def handler(job):
    """
    RunPod serverless handler.

    Image-based workflows (piel/edad/makeup/pecas/pelo/orbital):
    {
        "image": "<raw base64 string>",
        "scaleFactor": 1 or 2,
        "workflow_type": "piel" | "edad" | "makeup" | "pecas" | "pelo" | "orbital"
    }

    Video Translate workflow (video input):
    {
        "s3_key": "video-translate-uploads/<...>",
        "media_type": "video",
        "workflow_type": "video-translate"
    }

    Video Translate workflow (audio input):
    {
        "s3_key": "video-translate-uploads/<...>",
        "audio_extension": "mp3" | "wav" | "flac" | "m4a" | "ogg",
        "media_type": "audio",
        "workflow_type": "video-translate"
    }

    Image workflows return: { status, images: [...], execution_time_s }
    Video Translate returns: { status, audios: [...], execution_time_s }
    """
    start_time = time.time()
    job_input = job.get("input", {})
    workflow_type = job_input.get("workflow_type", "piel")

    if workflow_type not in WORKFLOW_FILES:
        return {"error": f"Unknown workflow_type: {workflow_type}. "
                         f"Valid: {list(WORKFLOW_FILES.keys())}"}

    # Video Translate has a completely different IO shape (video in, audio out)
    if workflow_type == "video-translate":
        return _handle_video_translate(job_input, start_time)

    return _handle_image_workflow(job_input, workflow_type, start_time)


def _handle_image_workflow(job_input: dict, workflow_type: str, start_time: float) -> dict:
    """Run an image-in / image-out workflow (piel, edad, makeup, pecas, pelo, orbital)."""
    image_filename = None
    extra_params: dict = {}

    image_b64 = job_input.get("image")
    if not image_b64:
        return {"error": "Missing required field: image (base64)"}

    scale_factor = job_input.get("scaleFactor", 1)
    if scale_factor not in (1, 2):
        return {"error": f"scaleFactor must be 1 (4K) or 2 (8K), got: {scale_factor}"}

    if workflow_type == "orbital":
        horizontal_select = job_input.get("horizontal_select")
        vertical_select = job_input.get("vertical_select")
        zoom_select = job_input.get("zoom_select")
        if horizontal_select is None or vertical_select is None or zoom_select is None:
            return {"error": "orbital workflow requires horizontal_select, vertical_select, and zoom_select"}
        h = int(horizontal_select)
        v = int(vertical_select)
        z = int(zoom_select)
        if not (1 <= h <= 9) or not (1 <= v <= 9) or not (1 <= z <= 3):
            return {"error": "horizontal_select/vertical_select must be 1-9, zoom_select must be 1-3"}

    print(f"[handler] Job started: workflow={workflow_type}, scale={scale_factor}")

    try:
        workflow = load_workflow(workflow_type)

        image_filename = f"input_{uuid.uuid4().hex[:8]}.png"
        save_image_to_input(image_b64, image_filename)

        if workflow_type == "makeup":
            makeup_b64 = job_input.get("makeup_ref")
            if not makeup_b64:
                return {"error": "Missing required field: makeup_ref (base64)"}
            makeup_filename = f"makeup_{uuid.uuid4().hex[:8]}.png"
            save_image_to_input(makeup_b64, makeup_filename)
            extra_params["makeup_filename"] = makeup_filename
        elif workflow_type == "pelo":
            pelo_b64 = job_input.get("pelo_ref")
            if not pelo_b64:
                return {"error": "Missing required field: pelo_ref (base64)"}
            pelo_filename = f"pelo_{uuid.uuid4().hex[:8]}.png"
            save_image_to_input(pelo_b64, pelo_filename)
            extra_params["pelo_filename"] = pelo_filename
        elif workflow_type == "edad":
            extra_params["age_select"] = job_input.get("age_select", 3)
        elif workflow_type == "pecas":
            extra_params["freckle_select"] = job_input.get("freckle_select", 1)
        elif workflow_type == "orbital":
            extra_params["horizontal_select"] = int(job_input.get("horizontal_select", 5))
            extra_params["vertical_select"] = int(job_input.get("vertical_select", 5))
            extra_params["zoom_select"] = int(job_input.get("zoom_select", 2))
            extra_params["image_base64"] = image_b64

        prepare_workflow(workflow, image_filename, scale_factor, workflow_type, extra_params)

        prompt_id = queue_prompt(workflow)
        history_entry = poll_until_complete(prompt_id)

        output_images = find_output_images(history_entry)
        if not output_images:
            return {"error": "Workflow completed but no output images found"}

        uploaded = []
        for img_path in output_images:
            if os.path.exists(img_path):
                uploaded.append(upload_to_s3(img_path, workflow_type))
            else:
                print(f"[handler] WARNING: Image file not found: {img_path}")

        if not uploaded:
            return {"error": "Failed to upload any output images to S3"}

        elapsed = round(time.time() - start_time, 1)
        print(f"[handler] Job complete in {elapsed}s, {len(uploaded)} image(s) uploaded")

        return {
            "status": "COMPLETED",
            "images": uploaded,
            "execution_time_s": elapsed,
        }

    except TimeoutError as e:
        return {"error": str(e)}
    except Exception as e:
        print(f"[handler] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        for fname in [image_filename, extra_params.get("makeup_filename"), extra_params.get("pelo_filename")]:
            try:
                if fname:
                    fpath = os.path.join(COMFYUI_INPUT_DIR, fname)
                    if os.path.exists(fpath):
                        os.remove(fpath)
            except Exception:
                pass


def _handle_video_translate(job_input: dict, start_time: float) -> dict:
    """
    Run the video-translate workflow: video or audio -> translated audio.

    The browser uploads the source file directly to S3 via the multipart
    upload API (`/api/video-translate-upload`) and forwards only the S3 key
    in `s3_key`. Base64 input is no longer accepted because it does not
    scale to 10 GB videos.
    """
    saved_filename = None
    s3_key = job_input.get("s3_key")

    if not s3_key or not isinstance(s3_key, str):
        return {"error": "Missing required field: s3_key"}

    media_type = (job_input.get("media_type") or "video").lower()
    if media_type not in ("video", "audio"):
        return {"error": f"media_type must be 'video' or 'audio', got: {media_type}"}

    extra_params: dict = {"media_type": media_type}

    if media_type == "audio":
        ext = (job_input.get("audio_extension") or "mp3").lower().lstrip(".")
        if ext not in ("mp3", "wav", "flac", "m4a", "ogg"):
            ext = "mp3"
        saved_filename = f"input_{uuid.uuid4().hex[:8]}.{ext}"
        print(
            f"[handler] Job started: workflow=video-translate, "
            f"media_type=audio, ext={ext}, s3_key={s3_key}"
        )
    else:
        saved_filename = f"input_{uuid.uuid4().hex[:8]}.mp4"
        print(
            f"[handler] Job started: workflow=video-translate, "
            f"media_type=video, s3_key={s3_key}"
        )

    try:
        workflow = load_workflow("video-translate")

        download_s3_key_to_input(s3_key, saved_filename)
        if media_type == "audio":
            extra_params["audio_filename"] = saved_filename
        else:
            extra_params["video_filename"] = saved_filename

        prepare_workflow(
            workflow,
            image_filename="",  # unused for video-translate
            scale_factor=0,     # unused for video-translate
            workflow_type="video-translate",
            extra_params=extra_params,
        )

        prompt_id = queue_prompt(workflow)
        history_entry = poll_until_complete(prompt_id)

        output_audios = find_output_audios(history_entry)
        if not output_audios:
            return {"error": "Workflow completed but no output audio found"}

        uploaded = []
        for audio_path in output_audios:
            if os.path.exists(audio_path):
                uploaded.append(upload_audio_to_s3(audio_path, "video-translate"))
            else:
                print(f"[handler] WARNING: Audio file not found: {audio_path}")

        if not uploaded:
            return {"error": "Failed to upload any output audio to S3"}

        elapsed = round(time.time() - start_time, 1)
        print(f"[handler] Job complete in {elapsed}s, {len(uploaded)} audio file(s) uploaded")

        return {
            "status": "COMPLETED",
            "audios": uploaded,
            "execution_time_s": elapsed,
        }

    except TimeoutError as e:
        return {"error": str(e)}
    except Exception as e:
        print(f"[handler] ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        try:
            if saved_filename:
                fpath = os.path.join(COMFYUI_INPUT_DIR, saved_filename)
                if os.path.exists(fpath):
                    os.remove(fpath)
        except Exception:
            pass
        # Always remove the upload object so abandoned/failed jobs don't
        # accumulate. Bucket lifecycle rules should also be configured as
        # a safety net (e.g. expire video-translate-uploads/ after 48h).
        if s3_key:
            delete_s3_key(s3_key)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("[handler] Vellum Workflows handler starting...")
    print(f"[handler] Available workflows: {list(WORKFLOW_FILES.keys())}")
    print(f"[handler] S3 bucket: {S3_BUCKET or '(not configured)'}")
    print(f"[handler] ComfyUI API key: {'configured' if COMFYUI_API_KEY else '(not configured - API nodes will fail)'}")
    runpod.serverless.start({"handler": handler})
