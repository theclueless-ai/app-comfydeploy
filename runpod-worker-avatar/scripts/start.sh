#!/bin/bash
set -e
echo "Starting Avatar & Poses Worker (xFormers + Pinned Memory)..."
START_TIME=$(date +%s)

# Verify environment
python3 -c "import xformers; print(f'xFormers: {xformers.__version__}')" 2>/dev/null || echo "Warning: xFormers not available"
python3 -c "import torch; print(f'PyTorch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"

# 1. Configure model paths
/setup_models.sh

# 2. Download missing models (background if network volume exists)
if [ -d "/runpod-volume" ]; then
    /download_models.sh &
    DOWNLOAD_PID=$!
fi

# 3. Start ComfyUI
cd /comfyui
python main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --enable-cors-header \
    --disable-auto-launch \
    --dont-print-server \
    --preview-method auto \
    --cuda-malloc \
    --use-pytorch-cross-attention &
COMFY_PID=$!

# 4. Wait for ComfyUI to be ready
echo "Waiting for ComfyUI..."
for i in $(seq 1 120); do
    if curl -s http://localhost:8188/system_stats >/dev/null 2>&1; then
        READY_TIME=$(date +%s)
        echo "ComfyUI ready in $((READY_TIME - START_TIME))s"
        break
    fi
    if [ $i -eq 120 ]; then
        echo "ComfyUI timeout after 120s"
        kill $COMFY_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

# 5. Wait for model download
if [ -n "$DOWNLOAD_PID" ]; then
    wait $DOWNLOAD_PID 2>/dev/null || true
fi

# 6. Warmup models (synchronous - must complete before accepting jobs)
if [ "${SKIP_WARMUP:-0}" != "1" ]; then
    /warmup_models.sh
fi

# 7. Verify critical nodes
echo "Verifying nodes..."
curl -s http://localhost:8188/object_info | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    critical = [
        # Core ComfyUI
        'LoadImage', 'SaveImage', 'KSampler', 'VAEDecode', 'VAEEncode',
        'CheckpointLoaderSimple', 'UNETLoader', 'CLIPLoader', 'VAELoader',
        'CLIPTextEncode', 'EmptyLatentImage',
        # Avatar-specific
        'CharacterPortraitGenerator', 'SeedVarianceEnhancer',
        'ColorCorrect', 'Power Lora Loader (rgthree)',
        'SeedVR2LoadDiTModel', 'SeedVR2LoadVAEModel', 'SeedVR2VideoUpscaler',
        'UltimateSDUpscaleNoUpscale',
        # Poses-specific
        'Flux2Scheduler', 'ReferenceLatent', 'EmptyFlux2LatentImage',
        'SamplerCustomAdvanced', 'CFGGuider', 'RandomNoise',
    ]
    missing = [n for n in critical if n not in data]
    if missing:
        print(f'WARNING: Missing {len(missing)} nodes: {missing}')
    else:
        print(f'All {len(critical)} critical nodes available')
except Exception as e:
    print(f'Verification error: {e}')
"

# 8. Start handler
INIT_TIME=$(date +%s)
echo "Starting handler (total init: $((INIT_TIME - START_TIME))s)"
python3 /src/handler.py
