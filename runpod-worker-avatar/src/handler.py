import runpod
import requests
import json
import base64
import io
import os
import time
import uuid
import gc
import torch
import boto3
from botocore.exceptions import ClientError
from PIL import Image

# ComfyUI API URL
COMFY_URL = "http://127.0.0.1:8188"

# AWS S3 Configuration
AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET', 'vellum-upscaler')

# Workflow paths (baked into Docker image)
AVATAR_WORKFLOW_PATH = "/workflows/avatar-workflow.json"
POSES_WORKFLOW_PATH = "/workflows/poses-workflow.json"


class S3Client:
    """Handles S3 uploads and downloads."""

    def __init__(self):
        self.client = boto3.client(
            's3',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        self.default_bucket = AWS_S3_BUCKET
        print(f"S3 Client initialized for bucket: {self.default_bucket}")

    def upload_image(self, image_data: bytes, task_id: str, filename: str) -> str:
        """Upload image to S3, returns public URL."""
        s3_key = f"processed/{task_id}/{filename}"
        ext = filename.rsplit('.', 1)[-1].lower()
        content_types = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'webp': 'image/webp'}

        self.client.put_object(
            Bucket=self.default_bucket,
            Key=s3_key,
            Body=image_data,
            ContentType=content_types.get(ext, 'image/png'),
            CacheControl='max-age=31536000',
            Metadata={'task_id': task_id, 'uploaded_at': str(int(time.time()))}
        )

        url = f"https://{self.default_bucket}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"Uploaded to S3: {url}")
        return url

    def download_image(self, s3_key: str, bucket: str = None, region: str = None) -> bytes:
        """Download image from S3 by key."""
        bucket = bucket or self.default_bucket
        # Use specific region client if different
        if region and region != AWS_REGION:
            client = boto3.client(
                's3',
                region_name=region,
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY
            )
        else:
            client = self.client

        print(f"Downloading from S3: s3://{bucket}/{s3_key}")
        response = client.get_object(Bucket=bucket, Key=s3_key)
        data = response['Body'].read()
        print(f"Downloaded {len(data)} bytes from S3")
        return data


class ComfyUIClient:
    """Communicates with local ComfyUI instance."""

    def __init__(self):
        self.client_id = str(uuid.uuid4())

    def queue_prompt(self, prompt):
        """Send prompt to ComfyUI."""
        p = {"prompt": prompt, "client_id": self.client_id}
        resp = requests.post(
            f"{COMFY_URL}/prompt",
            data=json.dumps(p).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        result = resp.json()
        if 'error' in result:
            raise RuntimeError(f"ComfyUI error: {result['error']}")
        return result

    def upload_image(self, image_data: bytes, filename: str) -> str:
        """Upload image to ComfyUI input directory. Returns the stored filename."""
        resp = requests.post(
            f"{COMFY_URL}/upload/image",
            files={'image': (filename, image_data, 'image/png')},
            data={'overwrite': 'true'}
        )
        resp.raise_for_status()
        result = resp.json()
        return result.get('name', filename)

    def get_image(self, filename, subfolder, folder_type):
        """Download generated image from ComfyUI."""
        params = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_params = "&".join([f"{k}={v}" for k, v in params.items()])
        resp = requests.get(f"{COMFY_URL}/view?{url_params}")
        resp.raise_for_status()
        return resp.content

    def get_history(self, prompt_id):
        """Get history for a prompt."""
        resp = requests.get(f"{COMFY_URL}/history/{prompt_id}")
        return resp.json()

    def wait_for_completion(self, prompt_id, timeout=1800):
        """Wait for prompt to complete, with progress logging."""
        start = time.time()
        print(f"Waiting for prompt {prompt_id} (timeout: {timeout}s)")

        while time.time() - start < timeout:
            try:
                history = self.get_history(prompt_id)
                if prompt_id in history:
                    elapsed = time.time() - start
                    print(f"Completed in {elapsed:.1f}s")
                    return history[prompt_id]

                elapsed = time.time() - start
                if int(elapsed) % 30 == 0 and int(elapsed) > 0:
                    print(f"  Progress: {elapsed:.0f}s elapsed...")

                time.sleep(5)
            except Exception as e:
                print(f"  Poll error: {e}")
                time.sleep(10)

        raise TimeoutError(f"Prompt timed out after {timeout}s")


def load_workflow(path: str) -> dict:
    """Load a workflow JSON from file."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Workflow not found: {path}")
    with open(path, 'r') as f:
        return json.load(f)


def cleanup_memory():
    """Free GPU memory after processing."""
    try:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()
        print("Memory cleaned")
    except Exception as e:
        print(f"Cleanup error: {e}")


def extract_images_from_nodes(comfy_client, history, node_ids, task_id, s3_client):
    """
    Extract images from specified ComfyUI output nodes, upload to S3.
    Falls back to scanning all nodes if specified nodes produce nothing.
    """
    output_images = []
    outputs = history.get('outputs', {})

    # Try specified nodes first
    for node_id in node_ids:
        if node_id in outputs and 'images' in outputs[node_id]:
            for img_info in outputs[node_id]['images']:
                filename = img_info['filename']
                subfolder = img_info.get('subfolder', '')
                image_data = comfy_client.get_image(filename, subfolder, 'output')

                # Validate image
                img = Image.open(io.BytesIO(image_data))
                print(f"  Node {node_id}: {img.size[0]}x{img.size[1]} - {filename}")

                s3_url = s3_client.upload_image(image_data, task_id, filename)
                output_images.append({
                    'filename': filename,
                    'url': s3_url,
                    'dimensions': list(img.size),
                    'file_size_mb': round(len(image_data) / (1024 * 1024), 2)
                })

    # Fallback: scan all nodes
    if not output_images:
        print("  No images in target nodes, scanning all outputs...")
        for node_id, node_output in outputs.items():
            if 'images' in node_output:
                for img_info in node_output['images']:
                    filename = img_info['filename']
                    subfolder = img_info.get('subfolder', '')
                    image_data = comfy_client.get_image(filename, subfolder, 'output')
                    img = Image.open(io.BytesIO(image_data))
                    print(f"  Node {node_id}: {img.size[0]}x{img.size[1]} - {filename}")

                    s3_url = s3_client.upload_image(image_data, task_id, filename)
                    output_images.append({
                        'filename': filename,
                        'url': s3_url,
                        'dimensions': list(img.size),
                        'file_size_mb': round(len(image_data) / (1024 * 1024), 2)
                    })

    return output_images


# =============================================================================
# Avatar Handler
# =============================================================================

def handle_avatar(input_data: dict, task_id: str, s3_client: S3Client) -> dict:
    """
    Generate avatar portrait.
    Input: character parameters (type, features, color grading).
    The workflow is loaded from the baked file and parameters are injected.
    """
    print("Loading avatar workflow...")
    workflow = load_workflow(AVATAR_WORKFLOW_PATH)

    # Inject CharacterPortraitGenerator parameters (Node 252)
    node_252 = workflow["252"]["inputs"]
    node_252["character_type"] = input_data.get("character_type", "HUMAN")
    node_252["seed"] = input_data.get("seed", 0)
    node_252["render_style"] = input_data.get("render_style", "RANDOM")
    node_252["lighting"] = input_data.get("lighting", "RANDOM")
    node_252["background"] = input_data.get("background", "white studio background")

    # Human features (A_ prefix)
    human_fields = [
        "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_skin_tone",
        "A_face_shape", "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
        "A_nose", "A_lips", "A_freckles", "A_expression", "A_distinctive_features",
    ]
    for field in human_fields:
        if field in input_data:
            node_252[field] = input_data[field]

    # Non-human features (B_ prefix)
    nonhuman_fields = [
        "B_skin_texture", "B_skin_color", "B_eyes", "B_face_structure", "B_organic_additions",
    ]
    for field in nonhuman_fields:
        if field in input_data:
            node_252[field] = input_data[field]

    # Color grading (Node 52)
    color_fields = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"]
    if "52" in workflow:
        node_52 = workflow["52"]["inputs"]
        for field in color_fields:
            if field in input_data and input_data[field] is not None:
                node_52[field] = float(input_data[field])

    print(f"Avatar params: type={node_252['character_type']}, seed={node_252['seed']}")

    # Queue prompt
    comfy_client = ComfyUIClient()
    result = comfy_client.queue_prompt(workflow)
    prompt_id = result['prompt_id']
    print(f"Prompt queued: {prompt_id}")

    # Wait for completion (avatar gen typically ~60-120s)
    history = comfy_client.wait_for_completion(prompt_id, timeout=600)

    # Extract images from Node 100 (SaveImage)
    output_images = extract_images_from_nodes(
        comfy_client, history, ["100"], task_id, s3_client
    )

    if not output_images:
        raise RuntimeError("No images generated by avatar workflow")

    print(f"Avatar completed: {len(output_images)} images")
    return {
        'status': 'success',
        'images': output_images,
    }


# =============================================================================
# Poses Handler
# =============================================================================

def handle_poses(input_data: dict, task_id: str, s3_client: S3Client) -> dict:
    """
    Generate 9 head poses from a portrait.
    Input: S3 reference to the portrait image.
    The workflow is loaded from the baked file and the image is injected.
    """
    # Download image from S3
    s3_key = input_data.get("s3_key")
    s3_bucket = input_data.get("s3_bucket", AWS_S3_BUCKET)
    s3_region = input_data.get("s3_region", AWS_REGION)

    if not s3_key:
        raise ValueError("Missing s3_key for poses input image")

    print(f"Downloading poses input from S3: {s3_key}")
    image_data = s3_client.download_image(s3_key, s3_bucket, s3_region)

    # Validate image
    img = Image.open(io.BytesIO(image_data))
    print(f"Input image: {img.size[0]}x{img.size[1]}")

    # Load workflow
    print("Loading poses workflow...")
    workflow = load_workflow(POSES_WORKFLOW_PATH)

    # Upload image to ComfyUI input directory
    comfy_client = ComfyUIClient()
    uploaded_name = comfy_client.upload_image(image_data, f"poses_input_{task_id}.png")
    print(f"Image uploaded to ComfyUI as: {uploaded_name}")

    # Inject filename into Node 99 (LoadImage)
    workflow["99"]["inputs"]["image"] = uploaded_name

    # Queue prompt
    result = comfy_client.queue_prompt(workflow)
    prompt_id = result['prompt_id']
    print(f"Prompt queued: {prompt_id}")

    # Wait for completion (poses gen with 9 outputs typically ~120-300s)
    history = comfy_client.wait_for_completion(prompt_id, timeout=900)

    # Extract images from all SaveImage nodes (9 poses)
    save_node_ids = ["9", "119", "120", "121", "122", "123", "124", "125", "126"]
    output_images = extract_images_from_nodes(
        comfy_client, history, save_node_ids, task_id, s3_client
    )

    if not output_images:
        raise RuntimeError("No images generated by poses workflow")

    print(f"Poses completed: {len(output_images)} images")
    return {
        'status': 'success',
        'images': output_images,
    }


# =============================================================================
# Main Handler
# =============================================================================

def handler(event):
    """
    RunPod handler for Avatar & Poses workflows.
    Dispatches based on input.type: "avatar" or "poses".
    """
    try:
        print("=" * 60)
        print("Avatar/Poses Handler started")
        print("=" * 60)

        input_data = event.get('input', {})
        job_type = input_data.get('type', 'avatar')
        task_id = str(uuid.uuid4())

        print(f"Job type: {job_type}")
        print(f"Task ID: {task_id}")

        # Initialize S3
        s3_client = S3Client()

        # Dispatch
        if job_type == "avatar":
            result = handle_avatar(input_data, task_id, s3_client)
        elif job_type == "poses":
            result = handle_poses(input_data, task_id, s3_client)
        else:
            return {
                "status": "FAILED",
                "error": f"Unknown job type: {job_type}. Expected 'avatar' or 'poses'."
            }

        return {
            "status": "COMPLETED",
            "output": result
        }

    except Exception as e:
        cleanup_memory()
        error_msg = f"Error: {str(e)}"
        print(f"Handler failed: {error_msg}")
        import traceback
        print(f"Traceback:\n{traceback.format_exc()}")
        return {
            "status": "FAILED",
            "error": error_msg
        }


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
