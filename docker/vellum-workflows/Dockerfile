# =============================================================================
# Vellum Workflows Docker Image (piel, edad, makeup, pecas)
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
# =============================================================================

FROM nvidia/cuda:12.6.3-cudnn-devel-ubuntu22.04

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
    libgl1-mesa-glx libglib2.0-0 libsm6 libxrender1 libxext6 \
    libgoogle-perftools-dev \
    build-essential gcc g++ cmake \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.10 /usr/bin/python

# =============================================================================
# PYTHON / PYTORCH (CUDA 12.8, optimized for 4090 Ada Lovelace)
# =============================================================================
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir \
        torch torchvision torchaudio \
        --index-url https://download.pytorch.org/whl/cu128

# xFormers for efficient attention on 4090
RUN pip install --no-cache-dir xformers

# =============================================================================
# COMFYUI
# =============================================================================
RUN git clone https://github.com/comfyanonymous/ComfyUI.git ${COMFYUI_DIR} && \
    cd ${COMFYUI_DIR} && \
    pip install --no-cache-dir -r requirements.txt

# =============================================================================
# CUSTOM NODES
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
RUN git clone https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler.git && \
    cd ComfyUI-SeedVR2_VideoUpscaler && \
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

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
RUN git clone https://github.com/jamesWalker55/comfyui-various.git && \
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
COPY lib/vellum-piel.json    /workflows/vellum-piel.json
COPY lib/vellum-edad.json    /workflows/vellum-edad.json
COPY lib/vellum-makeup.json  /workflows/vellum-makeup.json
COPY lib/vellum-pecas.json   /workflows/vellum-pecas.json

# Copy handler and start script
COPY docker/vellum-workflows/rp_handler.py /rp_handler.py
COPY docker/vellum-workflows/start.sh /start.sh
RUN chmod +x /start.sh

# Create model directories
RUN mkdir -p ${COMFYUI_DIR}/models/checkpoints/enhancer \
             ${COMFYUI_DIR}/models/checkpoints/Sdxl \
             ${COMFYUI_DIR}/models/upscale_models \
             ${COMFYUI_DIR}/models/vae \
             ${COMFYUI_DIR}/models/ultralytics/segm \
             ${COMFYUI_DIR}/models/sams \
             ${COMFYUI_DIR}/input \
             ${COMFYUI_DIR}/output

CMD ["/start.sh"]
