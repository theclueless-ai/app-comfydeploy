# =============================================================================
# Vellum Workflows Docker Image (piel, edad, makeup, pecas, orbital)
# Optimized for NVIDIA RTX 4090 (24GB VRAM, CUDA 12.x)
#
# Build:
#   docker build -f docker/vellum-workflows/Dockerfile -t your-registry/vellum-workflows:latest .
#   docker push your-registry/vellum-workflows:latest
#
# RunPod Env Vars required:
#   RUNPOD_API_KEY, AWS_S3_BUCKET, AWS_S3_REGION,
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_ENDPOINT_URL (optional)
#
# Attach a Network Volume at /runpod-volume for model persistence
#
# Network volume layout expected (new dirs for orbital):
#   models/vae/Qwen/qwen_image_vae.safetensors
#   models/clip/qwen_2.5_vl_7b_fp8_scaled.safetensors
#   models/unet/qwen-edit/qwen_image_edit_2511_bf16.safetensors
#   models/loras/Qwen/qwen-image-edit-2511-multiple-angles-lora.safetensors
#   models/loras/Qwen/Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors
# =============================================================================

FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV COMFYUI_DIR=/comfyui
ENV CUDA_VISIBLE_DEVICES=0
# 4090 optimization: expandable segments + aggressive GC for 24GB VRAM
ENV PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True,garbage_collection_threshold:0.8

# =============================================================================
# SYSTEM DEPENDENCIES
# =============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-venv python3-pip python3.10-dev \
    git wget curl \
    libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 libsndfile1 \
    libgoogle-perftools-dev \
    build-essential gcc g++ cmake \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.10 /usr/bin/python

# =============================================================================
# PYTHON / PYTORCH (CUDA 12.1, optimized for 4090 Ada Lovelace)
# torchaudio deliberately excluded — not needed for image workflows and it
# triggers a circular-import crash with this CUDA/PyTorch combination.
# xFormers also excluded — ComfyUI uses --use-pytorch-cross-attention instead.
# =============================================================================
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
        torch torchvision \
        --index-url https://download.pytorch.org/whl/cu121

# =============================================================================
# COMFYUI
# =============================================================================
RUN git clone https://github.com/comfyanonymous/ComfyUI.git ${COMFYUI_DIR} && \
    cd ${COMFYUI_DIR} && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -f comfy_extras/nodes_audio.py \
          comfy_extras/nodes_lt_audio.py \
          comfy_extras/nodes_audio_encoder.py

# =============================================================================
# CUSTOM NODES
# To force fresh clones (bypass Docker cache), rebuild with:
#   docker build --build-arg CACHEBUST=$(date +%s) ...
# This invalidates only from here down (PyTorch/CUDA layers stay cached)
ARG CACHEBUST=1
# Repos provided by the user + additional required nodes
# =============================================================================
WORKDIR ${COMFYUI_DIR}/custom_nodes

# 1. Impact Pack - FaceDetailer, SAMLoader, UltralyticsDetectorProvider,
#    ImpactSwitch, ImpactInversedSwitch, INTConstant
RUN git clone https://github.com/ltdrdata/ComfyUI-Impact-Pack.git && \
    cd ComfyUI-Impact-Pack && \
    pip install --no-cache-dir -r requirements.txt && \
    python install.py || true

# 2. Impact Subpack
RUN git clone https://github.com/ltdrdata/ComfyUI-Impact-Subpack.git && \
    cd ComfyUI-Impact-Subpack && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 3. SeedVR2 VideoUpscaler
#    Install diffusers with --no-deps to avoid pulling in xformers/flash_attn.
RUN pip install --no-cache-dir "transformers>=4.40,<4.46" && \
    pip install --no-cache-dir --no-deps "diffusers>=0.28,<0.31" && \
    git clone https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler.git && \
    cd ComfyUI-SeedVR2_VideoUpscaler && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir --no-deps -r requirements.txt; fi

# 4. KJNodes - ImageResizeKJv2, GrowMaskWithBlur
RUN git clone https://github.com/kijai/ComfyUI-KJNodes.git && \
    cd ComfyUI-KJNodes && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 5. Swwan - ColorMatch, Image Sharpen FS
RUN git clone https://github.com/aining2022/ComfyUI_Swwan.git && \
    cd ComfyUI_Swwan && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 6. rgthree - Image Resize (rgthree)
RUN git clone https://github.com/rgthree/rgthree-comfy.git && \
    cd rgthree-comfy && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 7. pysssss Custom Scripts - MathExpression
RUN git clone https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git && \
    cd ComfyUI-Custom-Scripts && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 8. LF Nodes - LF_IsLandscape
RUN git clone https://github.com/lucafoscili/lf-nodes.git && \
    cd lf-nodes && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 9. JW Various - JWImageResizeByLongerSide
#    comfyui_sound.py causes a torchaudio circular-import crash. The __init__.py
#    has a hardcoded module list — deleting the file leaves a ModuleNotFoundError.
#    Fix: remove the "comfyui_sound" entry from __init__.py's module list with sed.
RUN pip install --no-cache-dir soundfile && \
    git clone https://github.com/jamesWalker55/comfyui-various.git && \
    sed -i '/comfyui_sound/d' comfyui-various/__init__.py && \
    cd comfyui-various && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 10. RandomNumbers
RUN git clone https://github.com/ComfyNodePRs/PR-ComfyUI-RandomNumbers-c02289f4.git && \
    cd PR-ComfyUI-RandomNumbers-c02289f4 && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 11. RES4LYF
RUN git clone https://github.com/ClownsharkBatwing/RES4LYF.git && \
    cd RES4LYF && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 12. QualityOfLifeSuit Omar92 - Text _O node
RUN git clone https://github.com/omar92/ComfyUI-QualityOfLifeSuit_Omar92.git && \
    cd ComfyUI-QualityOfLifeSuit_Omar92 && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 13. Face Parsing - FaceParsingLoader, FaceParsingInfer, FacePartMask
RUN git clone https://github.com/Bwebbfx/ComfyUI_FaceParsing.git && \
    cd ComfyUI_FaceParsing && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 14. Easy Use - easy loadImageBase64, easy imageToBase64
RUN git clone https://github.com/yolain/ComfyUI-Easy-Use.git && \
    cd ComfyUI-Easy-Use && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

# 15. ByteDanceSeedreamNode is part of ComfyUI core - no separate install needed

# =============================================================================
# FIX: Re-pin transformers after all custom nodes (they may upgrade it).
# Do NOT reinstall diffusers with deps here — that would re-pull xformers.
# =============================================================================
RUN pip install --no-cache-dir "transformers>=4.40,<4.46"

# =============================================================================
# REMOVE torchaudio — ComfyUI's requirements.txt installs it, but the version
# it picks needs libcudart.so.13 (CUDA 13) which doesn't exist in this image
# (CUDA 12.1). ComfyUI handles missing torchaudio gracefully ("torchaudio
# missing, ACE model will be broken" — harmless for image-only workflows).
# Also remove any xformers that may have been pulled back in by other deps.
# =============================================================================
RUN pip uninstall -y torchaudio xformers 2>/dev/null; true

# =============================================================================
# RUNPOD + S3 DEPENDENCIES
# =============================================================================
RUN pip install --no-cache-dir \
    runpod \
    boto3 \
    requests \
    websocket-client \
    Pillow

# =============================================================================
# COPY HANDLER, START SCRIPT, AND WORKFLOW JSONs
# =============================================================================
WORKDIR /

# Copy workflow JSON files
# Place all these files alongside the Dockerfile before building:
#   Dockerfile, start.sh, rp_handler.py,
#   vellum-piel.json, vellum-edad.json, vellum-makeup.json,
#   vellum-pecas.json, vellum-orbital.json
COPY vellum-piel.json    /workflows/vellum-piel.json
COPY vellum-edad.json    /workflows/vellum-edad.json
COPY vellum-makeup.json  /workflows/vellum-makeup.json
COPY vellum-pecas.json   /workflows/vellum-pecas.json
COPY vellum-orbital.json /workflows/vellum-orbital.json

# Copy handler and start script
COPY rp_handler.py /rp_handler.py
COPY start.sh /start.sh
RUN dos2unix /start.sh /rp_handler.py \
    && chmod +x /start.sh

# Create model directories (including Qwen orbital models)
RUN mkdir -p ${COMFYUI_DIR}/models/checkpoints/enhancer \
             ${COMFYUI_DIR}/models/checkpoints/Sdxl \
             ${COMFYUI_DIR}/models/upscale_models \
             ${COMFYUI_DIR}/models/vae \
             ${COMFYUI_DIR}/models/vae/Qwen \
             ${COMFYUI_DIR}/models/clip \
             ${COMFYUI_DIR}/models/unet/qwen-edit \
             ${COMFYUI_DIR}/models/loras/Qwen \
             ${COMFYUI_DIR}/models/ultralytics/segm \
             ${COMFYUI_DIR}/models/sams \
             ${COMFYUI_DIR}/input \
             ${COMFYUI_DIR}/output

CMD ["/start.sh"]
