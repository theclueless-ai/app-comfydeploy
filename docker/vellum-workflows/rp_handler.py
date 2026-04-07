"""
RunPod Serverless Handler for Vellum Workflows (piel, edad, makeup, pecas).

Receives a job with:
  - image: raw base64 string (no data URI prefix)
  - scaleFactor: 1 (4K) or 2 (8K)
  - workflow_type: "piel" | "edad" | "makeup" | "pecas"

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
    "piel":   os.path.join(WORKFLOWS_DIR, "vellum-piel.json"),
    "edad":   os.path.join(WORKFLOWS_DIR, "vellum-edad.json"),
    "makeup": os.path.join(WORKFLOWS_DIR, "vellum-makeup.json"),
    "pecas":  os.path.join(WORKFLOWS_DIR, "vellum-pecas.json"),
}

# S3 configuration (from RunPod env vars)
S3_BUCKET = os.environ.get("AWS_S3_BUCKET", "")
S3_REGION = os.environ.get("AWS_S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.environ.get("AWS_ACCESS_KEY_ID", "")
S3_SECRET_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL", None)

# Timeout for workflow execution (minutes)
EXECUTION_TIMEOUT = 60

# Node IDs that are consistent across all 4 workflows
NODE_LOAD_IMAGE = "32"       # LoadImage node
NODE_SCALE_SELECTOR = "261"  # INTConstant: 1=4K, 2=8K
NODE_SAVE_IMAGE = "254"      # SaveImage output node


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


def prepare_workflow(workflow: dict, image_filename: str, scale_factor: int) -> dict:
    """
    Inject user inputs into the workflow:
      - Node 32 (LoadImage): set image filename
      - Node 261 (INTConstant): set scale value (1=4K, 2=8K)
    """
    # Inject image
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

    return workflow


def queue_prompt(workflow: dict) -> str:
    """
    Submit the workflow to ComfyUI's /prompt endpoint.
    Returns the prompt_id for tracking.
    """
    payload = {"prompt": workflow}
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

    Expected input:
    {
        "image": "<raw base64 string>",
        "scaleFactor": 1 or 2,
        "workflow_type": "piel" | "edad" | "makeup" | "pecas"
    }

    Returns:
    {
        "status": "COMPLETED",
        "images": [{ "url": "...", "filename": "...", "file_size_mb": ... }],
        "execution_time_s": 123.4
    }
    """
    start_time = time.time()
    job_input = job.get("input", {})

    # --- Validate inputs ---
    image_b64 = job_input.get("image")
    if not image_b64:
        return {"error": "Missing required field: image (base64)"}

    scale_factor = job_input.get("scaleFactor", 1)
    if scale_factor not in (1, 2):
        return {"error": f"scaleFactor must be 1 (4K) or 2 (8K), got: {scale_factor}"}

    workflow_type = job_input.get("workflow_type", "piel")
    if workflow_type not in WORKFLOW_FILES:
        return {"error": f"Unknown workflow_type: {workflow_type}. "
                         f"Valid: {list(WORKFLOW_FILES.keys())}"}

    print(f"[handler] Job started: workflow={workflow_type}, scale={scale_factor}")

    try:
        # 1. Load the workflow
        workflow = load_workflow(workflow_type)

        # 2. Save input image to ComfyUI input dir
        image_filename = f"input_{uuid.uuid4().hex[:8]}.png"
        save_image_to_input(image_b64, image_filename)

        # 3. Inject parameters into workflow
        prepare_workflow(workflow, image_filename, scale_factor)

        # 4. Submit to ComfyUI
        prompt_id = queue_prompt(workflow)

        # 5. Wait for completion
        history_entry = poll_until_complete(prompt_id)

        # 6. Find output images
        output_images = find_output_images(history_entry)
        if not output_images:
            return {"error": "Workflow completed but no output images found"}

        # 7. Upload to S3
        uploaded = []
        for img_path in output_images:
            if os.path.exists(img_path):
                result = upload_to_s3(img_path, workflow_type)
                uploaded.append(result)
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
        # Cleanup input image
        try:
            input_path = os.path.join(COMFYUI_INPUT_DIR, image_filename)
            if os.path.exists(input_path):
                os.remove(input_path)
        except Exception:
            pass


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("[handler] Vellum Workflows handler starting...")
    print(f"[handler] Available workflows: {list(WORKFLOW_FILES.keys())}")
    print(f"[handler] S3 bucket: {S3_BUCKET or '(not configured)'}")
    runpod.serverless.start({"handler": handler})
