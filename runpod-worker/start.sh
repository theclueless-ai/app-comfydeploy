#!/bin/bash
set -e

echo "=========================================="
echo "  AI Talk RunPod Worker - Starting..."
echo "=========================================="

COMFYUI_DIR="/comfyui"
VOLUME_DIR="/runpod-volume"
MODELS_DIR="${VOLUME_DIR}/models"

# =============================================================================
# 1. Symlink models from Network Volume to ComfyUI
# =============================================================================
echo "[1/4] Setting up model symlinks from Network Volume..."

if [ -d "${VOLUME_DIR}" ]; then
    echo "  Network Volume found at ${VOLUME_DIR}"

    # Create ComfyUI model directories if they don't exist
    mkdir -p ${COMFYUI_DIR}/models/diffusion_models
    mkdir -p ${COMFYUI_DIR}/models/text_encoders
    mkdir -p ${COMFYUI_DIR}/models/vae
    mkdir -p ${COMFYUI_DIR}/models/clip_vision
    mkdir -p ${COMFYUI_DIR}/models/loras/wan2.2
    mkdir -p ${COMFYUI_DIR}/models/custom  # for wav2vec, infinitetalk, etc.

    # --- Diffusion models ---
    if [ -f "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf" ]; then
        ln -sf "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf" \
            "${COMFYUI_DIR}/models/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf"
        echo "  -> Linked: wan2.1-i2v-14b-720p-Q8_0.gguf"
    fi

    # --- InfiniteTalk model ---
    # WanVideoWrapper looks in custom_nodes/ComfyUI-WanVideoWrapper/models/ or models/diffusion_models/
    if [ -f "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" ]; then
        mkdir -p "${COMFYUI_DIR}/custom_nodes/ComfyUI-WanVideoWrapper/models"
        ln -sf "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" \
            "${COMFYUI_DIR}/custom_nodes/ComfyUI-WanVideoWrapper/models/Wan2_1-InfiniTetalk-Single_fp16.safetensors"
        echo "  -> Linked: Wan2_1-InfiniTetalk-Single_fp16.safetensors"
    fi

    # --- Text encoder ---
    if [ -f "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors" \
            "${COMFYUI_DIR}/models/text_encoders/umt5-xxl-enc-bf16.safetensors"
        echo "  -> Linked: umt5-xxl-enc-bf16.safetensors"
    fi

    # --- VAE ---
    if [ -f "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors" \
            "${COMFYUI_DIR}/models/vae/Wan2_1_VAE_bf16.safetensors"
        echo "  -> Linked: Wan2_1_VAE_bf16.safetensors"
    fi

    # --- CLIP Vision ---
    if [ -f "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors" ]; then
        ln -sf "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors" \
            "${COMFYUI_DIR}/models/clip_vision/clip_vision_h.safetensors"
        echo "  -> Linked: clip_vision_h.safetensors"
    fi

    # --- Wav2Vec2 ---
    # WanVideoWrapper looks in custom_nodes/ComfyUI-WanVideoWrapper/models/ or models/
    if [ -f "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors" ]; then
        mkdir -p "${COMFYUI_DIR}/custom_nodes/ComfyUI-WanVideoWrapper/models"
        ln -sf "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors" \
            "${COMFYUI_DIR}/custom_nodes/ComfyUI-WanVideoWrapper/models/wav2vec2-chinese-base_fp16.safetensors"
        echo "  -> Linked: wav2vec2-chinese-base_fp16.safetensors"
    fi

    # --- LoRA ---
    if [ -f "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" \
            "${COMFYUI_DIR}/models/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors"
        echo "  -> Linked: lightx2v LoRA"
    fi

    echo "  Model symlinks complete!"
else
    echo "  WARNING: Network Volume not found at ${VOLUME_DIR}"
    echo "  Models must be available locally in ${COMFYUI_DIR}/models/"
fi

# =============================================================================
# 2. Start ComfyUI server in background
# =============================================================================
echo "[2/4] Starting ComfyUI server..."

cd ${COMFYUI_DIR}
python main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --disable-auto-launch \
    --disable-metadata \
    &

COMFYUI_PID=$!
echo "  ComfyUI PID: ${COMFYUI_PID}"

# =============================================================================
# 3. Wait for ComfyUI to be ready
# =============================================================================
echo "[3/4] Waiting for ComfyUI to be ready..."

MAX_RETRIES=120  # 2 minutes max (models take time to initialize)
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:8188/system_stats > /dev/null 2>&1; then
        echo "  ComfyUI is ready! (took ~${RETRY_COUNT}s)"
        break
    fi
    sleep 1
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $((RETRY_COUNT % 10)) -eq 0 ]; then
        echo "  Still waiting... (${RETRY_COUNT}s)"
    fi
done

if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "  ERROR: ComfyUI failed to start within ${MAX_RETRIES}s"
    exit 1
fi

# =============================================================================
# 4. Start RunPod handler
# =============================================================================
echo "[4/4] Starting RunPod serverless handler..."
echo "=========================================="

python rp_handler.py
