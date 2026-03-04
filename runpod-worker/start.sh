#!/bin/bash
set -e

echo "=========================================="
echo "  AI Talk RunPod Worker - Starting..."
echo "=========================================="

COMFYUI_DIR="/comfyui"
VOLUME_DIR="/runpod-volume"
MODELS_DIR="${VOLUME_DIR}/models"

# =============================================================================
# 1. Verify and symlink models from Network Volume to ComfyUI
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
    mkdir -p ${COMFYUI_DIR}/models/wav2vec2
    mkdir -p ${COMFYUI_DIR}/models/checkpoints

    MISSING=0

    # --- Diffusion models ---
    if [ -f "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf" ]; then
        ln -sf "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf" \
            "${COMFYUI_DIR}/models/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf"
        echo "  OK  Linked: wan2.1-i2v-14b-720p-Q8_0.gguf"
    else
        echo "  MISSING: diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf"
        MISSING=$((MISSING + 1))
    fi

    # --- InfiniteTalk model ---
    # MultiTalkModelLoader scans: models/diffusion_models/ + models/unet_gguf/
    if [ -f "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" \
            "${COMFYUI_DIR}/models/diffusion_models/Wan2_1-InfiniTetalk-Single_fp16.safetensors"
        echo "  OK  Linked: Wan2_1-InfiniTetalk-Single_fp16.safetensors -> models/diffusion_models/"
    else
        echo "  MISSING: infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors"
        echo "         NOTE: If you have 'infinitetalk_single.safetensors' that is the WRONG file."
        echo "         Re-run download_models.sh to get the correct fp16 version."
        MISSING=$((MISSING + 1))
    fi

    # --- Text encoder ---
    if [ -f "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors" \
            "${COMFYUI_DIR}/models/text_encoders/umt5-xxl-enc-bf16.safetensors"
        echo "  OK  Linked: umt5-xxl-enc-bf16.safetensors"
    else
        echo "  MISSING: text_encoders/umt5-xxl-enc-bf16.safetensors"
        MISSING=$((MISSING + 1))
    fi

    # --- VAE ---
    if [ -f "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors" \
            "${COMFYUI_DIR}/models/vae/Wan2_1_VAE_bf16.safetensors"
        echo "  OK  Linked: Wan2_1_VAE_bf16.safetensors"
    else
        echo "  MISSING: vae/Wan2_1_VAE_bf16.safetensors"
        MISSING=$((MISSING + 1))
    fi

    # --- CLIP Vision ---
    if [ -f "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors" ]; then
        ln -sf "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors" \
            "${COMFYUI_DIR}/models/clip_vision/clip_vision_h.safetensors"
        echo "  OK  Linked: clip_vision_h.safetensors"
    else
        echo "  MISSING: clip_vision/clip_vision_h.safetensors"
        MISSING=$((MISSING + 1))
    fi

    # --- Wav2Vec2 ---
    # Wav2VecModelLoader scans: models/wav2vec2/ (note: wav2vec2 with "2" at the end)
    if [ -f "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors" \
            "${COMFYUI_DIR}/models/wav2vec2/wav2vec2-chinese-base_fp16.safetensors"
        echo "  OK  Linked: wav2vec2-chinese-base_fp16.safetensors -> models/wav2vec2/"
    else
        echo "  MISSING: wav2vec/wav2vec2-chinese-base_fp16.safetensors"
        MISSING=$((MISSING + 1))
    fi

    # --- LoRA ---
    if [ -f "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" \
            "${COMFYUI_DIR}/models/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors"
        echo "  OK  Linked: lightx2v LoRA"
    else
        echo "  MISSING: loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors"
        echo "         NOTE: Check if file is inside a 'Lightx2v/' subfolder and move it up."
        MISSING=$((MISSING + 1))
    fi

    # --- SeedVR2 DiT Model ---
    if [ -f "${MODELS_DIR}/checkpoints/seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/checkpoints/seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors" \
            "${COMFYUI_DIR}/models/checkpoints/seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors"
        echo "  OK  Linked: seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors"
    else
        echo "  MISSING: checkpoints/seedvr2_ema_7b_fp8_e4m3fn_mixed_block35_fp16.safetensors"
        MISSING=$((MISSING + 1))
    fi

    # --- SeedVR2 VAE ---
    if [ -f "${MODELS_DIR}/checkpoints/ema_vae_fp16.safetensors" ]; then
        ln -sf "${MODELS_DIR}/checkpoints/ema_vae_fp16.safetensors" \
            "${COMFYUI_DIR}/models/checkpoints/ema_vae_fp16.safetensors"
        echo "  OK  Linked: ema_vae_fp16.safetensors (SeedVR2 VAE)"
    else
        echo "  MISSING: checkpoints/ema_vae_fp16.safetensors"
        MISSING=$((MISSING + 1))
    fi

    echo ""
    if [ $MISSING -gt 0 ]; then
        echo "  WARNING: ${MISSING} model(s) missing! The workflow may fail."
        echo "  Run download_models.sh on a Pod with this Network Volume to fix."
        echo ""
    else
        echo "  All 9 models linked successfully!"
    fi
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
