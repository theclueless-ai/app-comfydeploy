# =============================================================================
# RunPod Serverless Worker - AI Talk (ComfyUI + Seedance 1.5 API)
# All video generation happens through the Seedance API (no local diffusion
# models). The only GPU-bound workload is WhisperX transcription/translation,
# which runs comfortably on a small GPU (L4 / A10 / RTX 4090).
# =============================================================================

FROM nvidia/cuda:12.6.3-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV COMFYUI_DIR=/comfyui
ENV CUDA_MODULE_LOADING=LAZY
ENV CUDA_VISIBLE_DEVICES=0

# ---- System dependencies ----
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-venv python3-pip python3.10-dev \
    git wget curl \
    ffmpeg libsm6 libxext6 libgl1-mesa-glx libglib2.0-0 \
    build-essential \
    dos2unix \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip

# ---- Python base ----
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ---- PyTorch cu124 (WhisperX only; no diffusion models here) ----
RUN pip install --no-cache-dir \
    torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cu124

# ---- Clone ComfyUI ----
RUN git clone https://github.com/comfyanonymous/ComfyUI.git ${COMFYUI_DIR} \
    && cd ${COMFYUI_DIR} \
    && pip install --no-cache-dir -r requirements.txt

WORKDIR ${COMFYUI_DIR}

# =============================================================================
# Custom Nodes (all nodes referenced by workflow_api.json)
#   - pythongosssss/ComfyUI-Custom-Scripts        (ShowText, MathExpression)
#   - yolain/ComfyUI-Easy-Use                     (easy showAnything)
#   - Kosinkadink/ComfyUI-VideoHelperSuite        (VHS_LoadAudioUpload)
#   - christian-byrne/audio-separation-nodes-comfyui  (AudioCrop, AudioDuration)
#   - omar92/ComfyUI-QualityOfLifeSuit_Omar92     (Text _O, StringConcatenate)
#   - civen-cn/ComfyUI-Whisper-Translator         (Apply WhisperX)
#   - theclueless-ai/video_concat_node            (VideoConcat)
#   - theclueless-ai/comfyui-seedance-nodes       (SeedanceVideoGenerator)
#   - theclueless-ai/comfyui-seed-1.5-utilidades  (Seed15_DurationGateVideo)
#   - theclueless-ai/ComfyUI-AudioDuration         (AudioDuration)
# =============================================================================
RUN cd ${COMFYUI_DIR}/custom_nodes \
    && git clone --depth 1 https://github.com/pythongosssss/ComfyUI-Custom-Scripts.git \
    && git clone --depth 1 https://github.com/yolain/ComfyUI-Easy-Use.git \
    && git clone --depth 1 https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git \
    && git clone --depth 1 https://github.com/christian-byrne/audio-separation-nodes-comfyui.git \
    && git clone --depth 1 https://github.com/omar92/ComfyUI-QualityOfLifeSuit_Omar92.git \
    && git clone --depth 1 https://github.com/civen-cn/ComfyUI-Whisper-Translator.git \
    && git clone --depth 1 https://github.com/theclueless-ai/video_concat_node.git \
    && git clone --depth 1 https://github.com/theclueless-ai/comfyui-seedance-nodes.git \
    && git clone --depth 1 https://github.com/theclueless-ai/comfyui-seed-1.5-utilidades.git \
    && git clone --depth 1 https://github.com/theclueless-ai/comfyui-video-concat-9.git \
    && git clone --depth 1 https://github.com/theclueless-ai/spech-to-speach-elevenlabs-node.git \
    && git clone --depth 1 https://github.com/theclueless-ai/ComfyUI-AudioDuration.git

RUN for dir in ComfyUI-Custom-Scripts ComfyUI-Easy-Use ComfyUI-VideoHelperSuite \
    audio-separation-nodes-comfyui ComfyUI-QualityOfLifeSuit_Omar92 \
    ComfyUI-Whisper-Translator video_concat_node \
    comfyui-seedance-nodes comfyui-seed-1.5-utilidades \
    comfyui-video-concat-9 spech-to-speach-elevenlabs-node \
    ComfyUI-AudioDuration; do \
    if [ -f "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt" ]; then \
        pip install --no-cache-dir -r "${COMFYUI_DIR}/custom_nodes/$dir/requirements.txt"; \
    fi; \
    done

# ---- Belt & braces: ensure elevenlabs node deps are present even if the
#      custom_nodes layer above fails silently ----
RUN pip install --no-cache-dir elevenlabs miniaudio

# audio-separation-nodes-comfyui AudioVideoCombine raises ValueError on
# MoviePy 2.x when end_time equals video.duration up to float precision.
# 1.0.3 clamps silently. Pin after custom_nodes requirements so it overrides.
RUN pip install --no-cache-dir --force-reinstall "moviepy==1.0.3"

# ---- RunPod handler dependencies ----
RUN pip install --no-cache-dir \
    runpod \
    boto3 \
    requests \
    websocket-client

# ---- Copy handler and workflow ----
COPY rp_handler.py ${COMFYUI_DIR}/rp_handler.py
COPY workflow_api.json ${COMFYUI_DIR}/workflow_api.json
COPY start.sh /start.sh
COPY patch_seedance_download.py /tmp/patch_seedance_download.py

# ---- Patch comfyui-seedance-nodes download_video with retry+resume ----
# Without this, a single CDN hiccup in the middle of downloading a generated
# video aborts the whole prompt and wastes 10+ minutes of upstream generation.
RUN python3 /tmp/patch_seedance_download.py && rm /tmp/patch_seedance_download.py

RUN dos2unix /start.sh ${COMFYUI_DIR}/rp_handler.py \
    && chmod +x /start.sh

# ---- Environment variables (set at RunPod endpoint level) ----
# SEEDANCE_API_KEY       (required - injected into all 9 Seedance nodes)
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# AWS_S3_BUCKET
# AWS_S3_REGION
# AWS_S3_ENDPOINT_URL

CMD ["/start.sh"]
