# =============================================================================
# RunPod Serverless Worker - AI Talk (ComfyUI + InfiniteTalk/WanVideo)
# GPU: NVIDIA A100 80GB
# Models: Stored on RunPod Network Volume (/runpod-volume)
# =============================================================================

FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV COMFYUI_DIR=/comfyui
ENV CUDA_MODULE_LOADING=LAZY
ENV PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512,expandable_segments:True,garbage_collection_threshold:0.8

# ---- System dependencies (including dos2unix to fix CRLF) ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-venv python3-pip python3.10-dev \
    git git-lfs wget curl \
    ffmpeg libsm6 libxext6 libgl1-mesa-glx libglib2.0-0 \
    build-essential cmake \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

# ---- Python base dependencies ----
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ---- Install PyTorch (CUDA 12.1) ----
RUN pip install --no-cache-dir \
    torch==2.4.0 \
    torchvision==0.19.0 \
    torchaudio==2.4.0 \
    --index-url https://download.pytorch.org/whl/cu121

# ---- Clone ComfyUI ----
RUN git clone https://github.com/comfyanonymous/ComfyUI.git ${COMFYUI_DIR} \
    && cd ${COMFYUI_DIR} \
    && pip install --no-cache-dir -r requirements.txt

WORKDIR ${COMFYUI_DIR}

# =============================================================================
# Custom Nodes (all cloned in one layer for efficiency)
# =============================================================================
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone --depth 1 https://github.com/kijai/ComfyUI-WanVideoWrapper.git \
    && git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git \
    && git clone --depth 1 https://github.com/sysL-padawan/comfyui-elevenlabs-integration.git \
    && git clone --depth 1 https://github.com/karthikg-09/Elevenlabs-ComfyUI.git \
    && git clone --depth 1 https://github.com/yolain/ComfyUI-Easy-Use.git \
    && git clone --depth 1 https://github.com/chflame163/ComfyUI_LayerStyle.git \
    && git clone --depth 1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git \
    && git clone --depth 1 https://github.com/rgthree/rgthree-comfy.git

# Install requirements for each custom node
RUN for dir in ComfyUI-WanVideoWrapper ComfyUI-VideoHelperSuite comfyui-elevenlabs-integration \
    Elevenlabs-ComfyUI ComfyUI-Easy-Use ComfyUI_LayerStyle rgthree-comfy; do \
    if [ -f "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt" ]; then \
        pip install --no-cache-dir -r "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt" 2>/dev/null || true; \
    fi; \
    done

# =============================================================================
# RunPod handler dependencies
# =============================================================================
RUN pip install --no-cache-dir \
    runpod \
    boto3 \
    requests \
    websocket-client \
    gguf

# ---- Copy handler and workflow files ----
COPY rp_handler.py ${COMFYUI_DIR}/rp_handler.py
COPY workflow_api.json ${COMFYUI_DIR}/workflow_api.json
COPY start.sh /start.sh

# Convert scripts to Unix line endings and make executable
RUN dos2unix /start.sh ${COMFYUI_DIR}/rp_handler.py \
    && chmod +x /start.sh

# Create model directories
RUN mkdir -p ${COMFYUI_DIR}/models/diffusion_models \
    ${COMFYUI_DIR}/models/text_encoders \
    ${COMFYUI_DIR}/models/vae \
    ${COMFYUI_DIR}/models/clip_vision \
    ${COMFYUI_DIR}/models/loras/wan2.2 \
    /runpod-volume/models

# ---- Environment variables (set at RunPod endpoint level) ----
# ELEVENLABS_API_KEY   - ElevenLabs API key for TTS/STS nodes
# AWS_ACCESS_KEY_ID    - S3 credentials
# AWS_SECRET_ACCESS_KEY
# AWS_S3_BUCKET        - S3 bucket name
# AWS_S3_REGION        - S3 region (e.g., us-east-1)
# AWS_S3_ENDPOINT_URL  - (optional) Custom endpoint for R2/MinIO

CMD ["/start.sh"]
