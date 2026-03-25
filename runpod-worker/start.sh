#!/bin/bash
set -e

echo "=========================================="
echo "  AI Talk RunPod Worker - Starting..."
echo "  Workflow: LTX-2.3"
echo "=========================================="

COMFYUI_DIR="/comfyui"
VOLUME_DIR="/runpod-volume"
MODELS_DIR="${VOLUME_DIR}/models"

# =============================================================================
# 1. Link models from Network Volume to ComfyUI
# =============================================================================
echo "[1/4] Setting up model symlinks from Network Volume..."

link_model_category() {
    local category="$1"
    local vol_cat="${MODELS_DIR}/${category}"
    local comfy_cat="${COMFYUI_DIR}/models/${category}"

    mkdir -p "${comfy_cat}"

    if [ ! -d "${vol_cat}" ]; then
        echo "  WARNING: ${vol_cat} not found on volume — skipping ${category}"
        return
    fi

    for item in "${vol_cat}"/*; do
        [ -e "${item}" ] || continue
        name=$(basename "${item}")
        ln -sfn "${item}" "${comfy_cat}/${name}"
        echo "  Linked: ${category}/${name}"
    done
}

if [ -d "${VOLUME_DIR}" ]; then
    echo "  Network Volume found at ${VOLUME_DIR}"

    link_model_category checkpoints
    link_model_category vae
    link_model_category loras
    link_model_category latent_upscale_models
    link_model_category clip
    link_model_category diffusion_models

    echo ""
    echo "  Model linking complete."
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
    --highvram \
    --use-pytorch-cross-attention \
    --fast \
    --bf16-vae \
    --preview-method none \
    --disable-dynamic-vram \
    &

COMFYUI_PID=$!
echo "  ComfyUI PID: ${COMFYUI_PID}"

# =============================================================================
# 3. Wait for ComfyUI to be ready
# =============================================================================
echo "[3/4] Waiting for ComfyUI to be ready..."

MAX_RETRIES=120
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