# =============================================================================
# RunPod Serverless Worker - AI Talk (ComfyUI + LTX-2.3)
# GPU: NVIDIA A100 80GB
# =============================================================================

FROM nvidia/cuda:12.6.3-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV COMFYUI_DIR=/comfyui
ENV CUDA_MODULE_LOADING=LAZY
ENV CUDA_VISIBLE_DEVICES=0
ENV TORCH_CUDNN_V8_API_ENABLED=1
ENV CUDNN_FRONTEND_ATTN_DP_WORKSPACE_LIMIT=0
# Sin max_split_size_mb — contraproducente con 80GB VRAM
ENV PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,garbage_collection_threshold:0.8

# ---- System dependencies ----
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

# ---- PyTorch cu128 (desbloquea triton + cuda backends de comfy_kitchen) ----
RUN pip install --no-cache-dir \
    torch==2.7.0 torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu128

# ---- Flash Attention 2 (crítico para velocidad en A100) ----
RUN pip install --no-cache-dir packaging ninja psutil \
    && pip install flash-attn --no-build-isolation

# ---- xFormers ----
RUN pip install --no-cache-dir xformers \
    --index-url https://download.pytorch.org/whl/cu128

# ---- Clone ComfyUI ----
RUN git clone https://github.com/comfyanonymous/ComfyUI.git ${COMFYUI_DIR} \
    && cd ${COMFYUI_DIR} \
    && pip install --no-cache-dir -r requirements.txt

WORKDIR ${COMFYUI_DIR}

# ---- Custom Nodes ----
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone --depth 1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git \
    && git clone --depth 1 https://github.com/kijai/ComfyUI-KJNodes.git \
    && git clone --depth 1 https://github.com/yolain/ComfyUI-Easy-Use.git \
    && git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git \
    && git clone --depth 1 https://github.com/melMass/comfy_mtb.git \
    && git clone --depth 1 https://github.com/kijai/ComfyUI-MelBandRoFormer.git \
    && git clone --depth 1 https://github.com/ClownsharkBatwing/RES4LYF.git \
    && git clone --depth 1 https://github.com/theclueless-ai/spech-to-speach-elevenlabs-node.git

RUN for dir in ComfyUI-Custom-Scripts ComfyUI-KJNodes ComfyUI-Easy-Use \
    ComfyUI-VideoHelperSuite comfy_mtb ComfyUI-MelBandRoFormer RES4LYF \
    spech-to-speach-elevenlabs-node; do \
    if [ -f "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt" ]; then \
        pip install --no-cache-dir -r "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt" 2>/dev/null || true; \
    fi; \
    done

# ---- RunPod handler dependencies ----
RUN pip install --no-cache-dir \
    runpod \
    boto3 \
    requests \
    websocket-client \
    pyloudnorm

# ---- Copy handler and workflow files ----
COPY rp_handler.py ${COMFYUI_DIR}/rp_handler.py
COPY workflow_api.json ${COMFYUI_DIR}/workflow_api.json
COPY start.sh /start.sh

RUN dos2unix /start.sh ${COMFYUI_DIR}/rp_handler.py \
    && chmod +x /start.sh

# ---- Model directories ----
RUN mkdir -p ${COMFYUI_DIR}/models/checkpoints \
    ${COMFYUI_DIR}/models/vae \
    ${COMFYUI_DIR}/models/loras \
    ${COMFYUI_DIR}/models/latent_upscale_models \
    ${COMFYUI_DIR}/models/diffusion_models \
    ${COMFYUI_DIR}/models/clip \
    /runpod-volume/models

CMD ["/start.sh"]