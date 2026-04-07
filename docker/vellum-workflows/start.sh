#!/bin/bash
set -e

echo "========================================="
echo " Vellum Workflows Worker (4090 optimized)"
echo "========================================="

# =============================================================================
# 1. MODEL SETUP - Link from Network Volume
# =============================================================================
COMFYUI_DIR="/comfyui"

if [ -d "/runpod-volume" ]; then
    echo "[models] Network volume detected at /runpod-volume"
    MODELS_SRC="/runpod-volume/models"

    # Create source dirs on volume if missing
    mkdir -p "$MODELS_SRC/checkpoints/enhancer"
    mkdir -p "$MODELS_SRC/checkpoints/Sdxl"
    mkdir -p "$MODELS_SRC/upscale_models"
    mkdir -p "$MODELS_SRC/vae"
    mkdir -p "$MODELS_SRC/ultralytics/segm"
    mkdir -p "$MODELS_SRC/sams"
    mkdir -p "$MODELS_SRC/seedvr2"

    # Symlink each model subdirectory into ComfyUI
    for subdir in checkpoints upscale_models vae ultralytics sams; do
        target="$COMFYUI_DIR/models/$subdir"
        source="$MODELS_SRC/$subdir"
        if [ -d "$source" ]; then
            rm -rf "$target" 2>/dev/null || true
            ln -sfn "$source" "$target"
            echo "[models] Linked $target -> $source"
        fi
    done

    # SeedVR2 models (DiT ~15GB + VAE) - link the whole directory
    # ComfyUI expects: /comfyui/models/SEEDVR2/seedvr2_ema_7b_fp16.safetensors
    SEEDVR2_TARGET="$COMFYUI_DIR/models/SEEDVR2"
    SEEDVR2_SOURCE="$MODELS_SRC/seedvr2"
    rm -rf "$SEEDVR2_TARGET" 2>/dev/null || true
    ln -sfn "$SEEDVR2_SOURCE" "$SEEDVR2_TARGET"
    echo "[models] Linked $SEEDVR2_TARGET -> $SEEDVR2_SOURCE"

    echo "[models] Network volume setup complete"
else
    echo "[models] WARNING: No network volume at /runpod-volume"
    echo "[models] Models must exist locally in $COMFYUI_DIR/models/"
fi

# =============================================================================
# 2. VERIFY CRITICAL MODELS
# =============================================================================
echo ""
echo "[verify] Checking critical model files..."

check_model() {
    local path="$1"
    local name="$2"
    if [ -f "$path" ]; then
        local size=$(stat -c%s "$path" 2>/dev/null || echo 0)
        echo "[verify] OK  $name ($(numfmt --to=iec $size 2>/dev/null || echo ${size}B))"
    else
        echo "[verify] MISSING  $name ($path)"
    fi
}

check_model "$COMFYUI_DIR/models/checkpoints/enhancer/enhancor_skin_fix.safetensors" "Skin Fix Checkpoint"
check_model "$COMFYUI_DIR/models/checkpoints/Sdxl/intorealismUltra_v90.safetensors" "IntoRealism XL Checkpoint"
check_model "$COMFYUI_DIR/models/upscale_models/RealESRGAN_x2plus.pth" "RealESRGAN x2plus"
check_model "$COMFYUI_DIR/models/ultralytics/segm/PitEyeDetailer-v2-seg.pt" "PitEyeDetailer Segm"
check_model "$COMFYUI_DIR/models/sams/sam_vit_b_01ec64.pth" "SAM ViT-B"
check_model "$COMFYUI_DIR/models/SEEDVR2/seedvr2_ema_7b_fp16.safetensors" "SeedVR2 DiT (15G)"
check_model "$COMFYUI_DIR/models/SEEDVR2/ema_vae_fp16.safetensors" "SeedVR2 VAE"

echo ""

# =============================================================================
# 3. START COMFYUI SERVER
# Optimized for RTX 4090 (24GB VRAM):
#   --highvram        : Keep models in VRAM (24GB is enough)
#   --fast            : Enable fast mode optimizations
#   --bf16-vae        : Use bf16 for VAE (4090 supports bf16 natively)
#   --use-pytorch-cross-attention : Faster than xformers on Ada Lovelace
#   --preview-method none : No preview overhead in serverless
# =============================================================================
echo "[comfyui] Starting ComfyUI server (4090 mode)..."

cd "$COMFYUI_DIR"
python3 main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --disable-auto-launch \
    --disable-metadata \
    --highvram \
    --use-pytorch-cross-attention \
    --fast \
    --bf16-vae \
    --preview-method none \
    &

COMFYUI_PID=$!
echo "[comfyui] PID: $COMFYUI_PID"

# =============================================================================
# 4. HEALTH CHECK - Wait for ComfyUI to be ready
# =============================================================================
echo "[comfyui] Waiting for server to be ready..."

MAX_WAIT=180
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://127.0.0.1:8188/system_stats > /dev/null 2>&1; then
        echo "[comfyui] Server ready after ${ELAPSED}s"
        break
    fi

    # Check if process died
    if ! kill -0 $COMFYUI_PID 2>/dev/null; then
        echo "[comfyui] ERROR: ComfyUI process died"
        exit 1
    fi

    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "[comfyui] ERROR: Server did not start within ${MAX_WAIT}s"
    exit 1
fi

# =============================================================================
# 5. START RUNPOD HANDLER
# =============================================================================
echo "[handler] Starting RunPod handler..."
cd /
python3 -u /rp_handler.py
