# =============================================================================
# DOCKERFILE - AVATAR & POSES WORKER (RunPod Serverless)
# =============================================================================
# Models used:
#   Avatar: zImageTurboAIO (UNET), cyberrealisticXL (SDXL checkpoint),
#           qwen_3_4b (CLIP/lumina2), ae.safetensors (Flux VAE),
#           SeedVR2 (upscaler), DetailedEyes + skin LoRAs
#   Poses:  flux-2-klein-9b (UNET), qwen_3_8b_fp8mixed (CLIP/flux2),
#           Flux2/ae.safetensors (VAE)
#
# Custom nodes:
#   CharacterPortraitGenerator, SeedVR2, GGUF loader, Easy-Use,
#   rgthree, post-processing, Custom-Scripts, KJNodes,
#   UltimateSDUpscale, essentials
# Note: Flux2 nodes (Flux2Scheduler, ReferenceLatent, EmptyFlux2LatentImage)
#   are native ComfyUI core nodes (>= 0.3.71), no custom node needed
# =============================================================================

# Stage 1: Builder
FROM timpietruskyblibla/runpod-worker-comfy:3.4.0-flux1-schnell AS builder
USER root

RUN python3 -m pip install --upgrade pip setuptools wheel --no-cache-dir

# =============================================================================
# PyTorch 2.5.1 + CUDA 12.4 + xFormers
# =============================================================================
RUN pip uninstall -y torch torchvision torchaudio xformers 2>/dev/null || true && \
    pip install --no-cache-dir \
    torch==2.5.1+cu124 \
    torchvision==0.20.1+cu124 \
    torchaudio==2.5.1+cu124 \
    --index-url https://download.pytorch.org/whl/cu124 && \
    pip install --no-cache-dir xformers==0.0.28.post3

# Update ComfyUI to latest
RUN cd /comfyui && \
    git fetch origin && \
    git checkout master && \
    git pull origin master && \
    pip install --no-cache-dir -r requirements.txt

# Python dependencies (single layer)
RUN pip install --no-cache-dir \
    gguf \
    numpy \
    runpod \
    requests \
    Pillow \
    websocket-client \
    boto3 \
    botocore \
    psutil \
    GPUtil \
    aiofiles \
    opencv-python-headless==4.8.1.78 \
    scikit-image \
    matplotlib \
    scipy \
    pandas \
    numba \
    mediapipe \
    insightface \
    onnxruntime \
    ultralytics \
    filterpy \
    kornia \
    facexlib \
    rembg \
    blend-modes \
    timm \
    torchsde \
    simpleeval \
    py-cpuinfo

# =============================================================================
# Custom nodes (single layer)
# =============================================================================
WORKDIR /comfyui/custom_nodes

RUN git clone --depth 1 https://github.com/city96/ComfyUI-GGUF.git && \
    git clone --depth 1 https://github.com/yolain/ComfyUI-Easy-Use.git && \
    git clone --depth 1 https://github.com/WASasquatch/was-node-suite-comfyui.git && \
    git clone --depth 1 https://github.com/Fannovel16/comfyui_controlnet_aux.git && \
    git clone https://github.com/ssitu/ComfyUI_UltimateSDUpscale.git && \
    cd ComfyUI_UltimateSDUpscale && git checkout 48ffea161f && cd .. && \
    git clone --depth 1 https://github.com/shiimizu/ComfyUI-TiledDiffusion.git && \
    git clone --depth 1 https://github.com/BlenderNeko/ComfyUI_TiledKSampler.git && \
    git clone --depth 1 https://github.com/rgthree/rgthree-comfy.git && \
    git clone --depth 1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git && \
    git clone --depth 1 https://github.com/kijai/ComfyUI-KJNodes.git && \
    git clone --depth 1 https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler.git && \
    git clone --depth 1 https://github.com/Bwebbfx/ComfyUI_FaceParsing.git && \
    git clone --depth 1 https://github.com/BadCafeCode/masquerade-nodes-comfyui.git && \
    git clone --depth 1 https://github.com/sipherxyz/comfyui-art-venture && \
    git clone --depth 1 https://github.com/EllangoK/ComfyUI-post-processing-nodes.git && \
    git clone --depth 1 https://github.com/wildminder/ComfyUI-DyPE && \
    git clone --depth 1 https://github.com/lucafoscili/comfyui-lf.git && \
    git clone --depth 1 https://github.com/jags111/efficiency-nodes-comfyui.git && \
    git clone --depth 1 https://github.com/ChangeTheConstants/SeedVarianceEnhancer && \
    git clone --depth 1 https://github.com/gseth/ControlAltAI-Nodes && \
    git clone --depth 1 https://github.com/theclueless-ai/character_prompt_generator && \
    git clone --depth 1 https://github.com/cubiq/ComfyUI_essentials.git

# Install requirements for custom nodes
RUN for dir in ComfyUI-GGUF ComfyUI-Easy-Use comfyui_controlnet_aux ComfyUI-TiledDiffusion \
    ComfyUI-KJNodes ComfyUI-SeedVR2_VideoUpscaler ComfyUI_FaceParsing comfyui-art-venture \
    ComfyUI-DyPE comfyui-lf ComfyUI_essentials; do \
    if [ -f "/comfyui/custom_nodes/$dir/requirements.txt" ]; then \
        pip install --no-cache-dir -r "/comfyui/custom_nodes/$dir/requirements.txt" 2>/dev/null || true; \
    fi; \
    done && \
    if [ -f "/comfyui/custom_nodes/was-node-suite-comfyui/requirements.txt" ]; then \
        grep -v "opencv-python" /comfyui/custom_nodes/was-node-suite-comfyui/requirements.txt | \
        pip install --no-cache-dir -r /dev/stdin 2>/dev/null || true; \
    fi

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM timpietruskyblibla/runpod-worker-comfy:3.4.0-flux1-schnell

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    CUDA_VISIBLE_DEVICES=0 \
    CUDA_MODULE_LOADING=LAZY \
    CUDA_CACHE_DISABLE=0 \
    CUDA_CACHE_MAXSIZE=2147483648 \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512,expandable_segments:True,garbage_collection_threshold:0.8 \
    PYTORCH_ENABLE_CUDNN_BENCHMARK=1 \
    PYTORCH_PINNED_MEMORY=1 \
    COMFY_ENABLE_PINNED_MEMORY=1 \
    XFORMERS_ENABLED=1 \
    ATTN_PRECISION=fp16 \
    COMFYUI_PATH=/comfyui \
    COMFY_MODEL_CACHING=1 \
    MALLOC_TRIM_THRESHOLD_=131072 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TRANSFORMERS_OFFLINE=0

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl git net-tools libgl1-mesa-glx libglib2.0-0 dos2unix \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy built ComfyUI + custom nodes + Python packages from builder
COPY --from=builder /comfyui /comfyui
COPY --from=builder /usr/local/lib/python3.10/dist-packages /usr/local/lib/python3.10/dist-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Fix cffi/bindings compatibility
RUN pip uninstall -y pycares aiodns tokenizers 2>/dev/null || true && \
    pip install --no-cache-dir --force-reinstall pycares aiodns aiohttp tokenizers transformers

# Create model directories
RUN mkdir -p /comfyui/models/checkpoints/Sdxl \
    /comfyui/models/unet/Zit \
    /comfyui/models/unet/Klein \
    /comfyui/models/clip \
    /comfyui/models/vae/Flux \
    /comfyui/models/vae/Flux2 \
    /comfyui/models/loras/sDXL \
    /comfyui/models/loras/Z-Image \
    /comfyui/models/loras/SDXL \
    /comfyui/models/SEEDVR2 \
    /comfyui/models/controlnet \
    /runpod-volume/models

# Copy handler and workflows
WORKDIR /
COPY src/handler.py /src/handler.py
COPY workflows/avatar-workflow.json /workflows/avatar-workflow.json
COPY workflows/poses-workflow.json /workflows/poses-workflow.json
RUN chmod +x /src/handler.py

# Copy and prepare scripts
COPY scripts/start.sh /start.sh
COPY scripts/warmup_models.sh /warmup_models.sh
COPY scripts/setup_models.sh /setup_models.sh
COPY scripts/download_models.sh /download_models.sh

RUN dos2unix /start.sh /warmup_models.sh /setup_models.sh /download_models.sh && \
    chmod +x /start.sh /warmup_models.sh /setup_models.sh /download_models.sh

EXPOSE 8188
CMD ["/start.sh"]
