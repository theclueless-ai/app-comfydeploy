#!/bin/bash
set -e

echo "=========================================="
echo "  AI Talk RunPod Worker - Starting..."
echo "  Workflow: Seedance 1.5 (API-only)"
echo "=========================================="

COMFYUI_DIR="/comfyui"

# =============================================================================
# 1. Start ComfyUI server in background
# =============================================================================
echo "[1/3] Starting ComfyUI server..."

cd ${COMFYUI_DIR}
python main.py \
    --listen 0.0.0.0 \
    --port 8188 \
    --disable-auto-launch \
    --disable-metadata \
    --preview-method none \
    &

COMFYUI_PID=$!
echo "  ComfyUI PID: ${COMFYUI_PID}"

# =============================================================================
# 2. Wait for ComfyUI to be ready
# =============================================================================
echo "[2/3] Waiting for ComfyUI to be ready..."

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
# 3. Start RunPod handler
# =============================================================================
echo "[3/3] Starting RunPod serverless handler..."
echo "=========================================="

python rp_handler.py
