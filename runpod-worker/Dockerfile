# =============================================================================
# RunPod Serverless Worker - AI Talk (ComfyUI + InfiniteTalk/WanVideo)
# GPU: NVIDIA A100 80GB
# Models: Stored on RunPod Network Volume (/runpod-volume)
# =============================================================================

FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV COMFYUI_DIR=/comfyui

# ---- System dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-venv python3-pip python3.10-dev \
    git git-lfs wget curl \
    ffmpeg libsm6 libxext6 libgl1-mesa-glx \
    build-essential cmake \
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
# Custom Nodes
# =============================================================================

# 1. ComfyUI-WanVideoWrapper (Kijai) - Core InfiniteTalk/MultiTalk nodes
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/kijai/ComfyUI-WanVideoWrapper.git \
    && cd ComfyUI-WanVideoWrapper \
    && pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# 2. ComfyUI-VideoHelperSuite - VHS_VideoCombine (video output)
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git \
    && cd ComfyUI-VideoHelperSuite \
    && pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# 3. Elevenlabs-ComfyUI - TTS + Voice Changer (Speech-to-Speech)
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/karthikg-09/Elevenlabs-ComfyUI.git \
    && cd Elevenlabs-ComfyUI \
    && pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# 4. ComfyUI-Easy-Use - easy loadImageBase64 node
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/yolain/ComfyUI-Easy-Use.git \
    && cd ComfyUI-Easy-Use \
    && pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# 5. ComfyUI_LayerStyle - GetImageSize and image utilities
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/chflame163/ComfyUI_LayerStyle.git \
    && cd ComfyUI_LayerStyle \
    && pip install --no-cache-dir -r requirements.txt 2>/dev/null || true

# 6. ComfyUI-Custom-Scripts - General utilities
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git

# =============================================================================
# RunPod handler dependencies
# =============================================================================
RUN pip install --no-cache-dir \
    runpod \
    boto3 \
    requests \
    websocket-client

# ---- Copy handler and workflow files ----
COPY rp_handler.py ${COMFYUI_DIR}/rp_handler.py
COPY workflow_api.json ${COMFYUI_DIR}/workflow_api.json
COPY start.sh /start.sh
RUN chmod +x /start.sh

# ---- Environment variables (set at RunPod endpoint level) ----
# ELEVENLABS_API_KEY   - ElevenLabs API key for TTS/STS nodes
# AWS_ACCESS_KEY_ID    - S3 credentials
# AWS_SECRET_ACCESS_KEY
# AWS_S3_BUCKET        - S3 bucket name
# AWS_S3_REGION        - S3 region (e.g., us-east-1)
# AWS_S3_ENDPOINT_URL  - (optional) Custom endpoint for R2/MinIO

CMD ["/start.sh"]
