#!/bin/bash
# =============================================================================
# Model Download Script for RunPod Network Volume
# Uses Python hf_hub_download (huggingface-cli may not exist in older hub versions)
#
# Run this ONCE on a temporary RunPod pod with the Network Volume attached.
# Example:
#   1. Create a basic GPU pod with Network Volume mounted at /workspace
#   2. Upload this script and run: bash download_models.sh
#   3. Terminate the pod (volume persists)
#
# The script auto-detects the volume mount point:
#   - Pods: /workspace
#   - Serverless: /runpod-volume
#
# Prerequisites: pip install huggingface_hub hf_transfer
# =============================================================================

set -e

# Auto-detect volume mount point (Pods use /workspace, Serverless uses /runpod-volume)
if [ -d "/workspace" ]; then
    VOLUME_DIR="/workspace"
elif [ -d "/runpod-volume" ]; then
    VOLUME_DIR="/runpod-volume"
else
    echo "ERROR: No volume mount found at /workspace or /runpod-volume"
    echo "Make sure you have a Network Volume attached."
    exit 1
fi

MODELS_DIR="${VOLUME_DIR}/models"

echo "=========================================="
echo "  AI Talk - Model Download Script"
echo "=========================================="
echo "  Volume: ${VOLUME_DIR}"
echo "  Models: ${MODELS_DIR}"
echo ""

# Install huggingface_hub if not available
python3 -c "import huggingface_hub" 2>/dev/null || pip install -q huggingface_hub hf_transfer

# Enable hf_transfer for faster downloads if available
export HF_HUB_ENABLE_HF_TRANSFER=1

# Create directory structure
mkdir -p "${MODELS_DIR}/diffusion_models"
mkdir -p "${MODELS_DIR}/infinitetalk"
mkdir -p "${MODELS_DIR}/text_encoders"
mkdir -p "${MODELS_DIR}/vae"
mkdir -p "${MODELS_DIR}/clip_vision"
mkdir -p "${MODELS_DIR}/wav2vec"
mkdir -p "${MODELS_DIR}/loras/wan2.2"

# =============================================================================
# 1. InfiniteTalk Model (~5 GB)
#    IMPORTANT: Must use revision='refs/pr/76' to get the correct fp16 version.
#    Without it, you get a different file (infinitetalk_single.safetensors).
# =============================================================================
echo ""
echo "[1/7] Downloading InfiniteTalk model..."
if [ ! -f "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" ]; then
    # Remove wrong file if it exists (from downloads without --revision)
    rm -f "${MODELS_DIR}/infinitetalk/infinitetalk_single.safetensors"

    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Kijai/WanVideo_comfy',
    'InfiniteTalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors',
    revision='refs/pr/76',
    local_dir='${MODELS_DIR}/infinitetalk'
)
print('Downloaded!')
"

    # huggingface_hub preserves folder structure, so move from subfolder
    if [ -f "${MODELS_DIR}/infinitetalk/InfiniteTalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" ]; then
        mv "${MODELS_DIR}/infinitetalk/InfiniteTalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors" \
            "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors"
        rm -rf "${MODELS_DIR}/infinitetalk/InfiniteTalk"
    fi
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 2. Wan2.1 I2V 14B GGUF (~18 GB)
# =============================================================================
echo ""
echo "[2/7] Downloading Wan2.1 I2V 14B GGUF model..."
if [ ! -f "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'city96/Wan2.1-I2V-14B-720P-gguf',
    'wan2.1-i2v-14b-720p-Q8_0.gguf',
    local_dir='${MODELS_DIR}/diffusion_models'
)
print('Downloaded!')
"
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 3. Text Encoder - UMT5-XXL (~11 GB)
# =============================================================================
echo ""
echo "[3/7] Downloading UMT5-XXL text encoder..."
if [ ! -f "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Comfy-Org/Wan_2.1_ComfyUI_repackaged',
    'split_files/text_encoders/umt5_xxl_fp16.safetensors',
    local_dir='${MODELS_DIR}/text_encoders'
)
print('Downloaded!')
"

    # Move from subfolder and rename
    if [ -f "${MODELS_DIR}/text_encoders/split_files/text_encoders/umt5_xxl_fp16.safetensors" ]; then
        mv "${MODELS_DIR}/text_encoders/split_files/text_encoders/umt5_xxl_fp16.safetensors" \
            "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors"
        rm -rf "${MODELS_DIR}/text_encoders/split_files"
    fi
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 4. VAE (~254 MB)
# =============================================================================
echo ""
echo "[4/7] Downloading Wan2.1 VAE..."
if [ ! -f "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Comfy-Org/Wan_2.1_ComfyUI_repackaged',
    'split_files/vae/wan_2.1_vae.safetensors',
    local_dir='${MODELS_DIR}/vae'
)
print('Downloaded!')
"

    # Move from subfolder and rename
    if [ -f "${MODELS_DIR}/vae/split_files/vae/wan_2.1_vae.safetensors" ]; then
        mv "${MODELS_DIR}/vae/split_files/vae/wan_2.1_vae.safetensors" \
            "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors"
        rm -rf "${MODELS_DIR}/vae/split_files"
    fi
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 5. CLIP Vision H (~3.9 GB)
# =============================================================================
echo ""
echo "[5/7] Downloading CLIP Vision H..."
if [ ! -f "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Comfy-Org/Wan_2.1_ComfyUI_repackaged',
    'split_files/clip_vision/clip_vision_h.safetensors',
    local_dir='${MODELS_DIR}/clip_vision'
)
print('Downloaded!')
"

    # Move from subfolder
    if [ -f "${MODELS_DIR}/clip_vision/split_files/clip_vision/clip_vision_h.safetensors" ]; then
        mv "${MODELS_DIR}/clip_vision/split_files/clip_vision/clip_vision_h.safetensors" \
            "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors"
        rm -rf "${MODELS_DIR}/clip_vision/split_files"
    fi
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 6. Wav2Vec2 Chinese Base (~190 MB)
# =============================================================================
echo ""
echo "[6/7] Downloading Wav2Vec2 Chinese Base..."
if [ ! -f "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Kijai/wav2vec2_safetensors',
    'wav2vec2-chinese-base_fp16.safetensors',
    local_dir='${MODELS_DIR}/wav2vec'
)
print('Downloaded!')
"
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# 7. LightX2V LoRA (~1.5 GB)
#    NOTE: huggingface_hub creates a Lightx2v/ subfolder because the file path
#    on HF is Lightx2v/filename.safetensors. We move it up after download.
# =============================================================================
echo ""
echo "[7/7] Downloading LightX2V I2V LoRA..."
if [ ! -f "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" ]; then
    python3 -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    'Kijai/WanVideo_comfy',
    'Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors',
    local_dir='${MODELS_DIR}/loras/wan2.2'
)
print('Downloaded!')
"

    # Move from Lightx2v/ subfolder
    if [ -f "${MODELS_DIR}/loras/wan2.2/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" ]; then
        mv "${MODELS_DIR}/loras/wan2.2/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors" \
            "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors"
        rm -rf "${MODELS_DIR}/loras/wan2.2/Lightx2v"
    fi
    echo "  Done!"
else
    echo "  Already exists, skipping."
fi

# =============================================================================
# Verification
# =============================================================================
echo ""
echo "=========================================="
echo "  Download Complete! Verifying files..."
echo "=========================================="
echo ""

MISSING=0
check_file() {
    if [ -f "$1" ]; then
        SIZE=$(du -h "$1" | cut -f1)
        echo "  OK  ${SIZE}  $(basename $1)"
    else
        echo "  MISSING      $(basename $1)  <-- NEEDS ATTENTION"
        MISSING=$((MISSING + 1))
    fi
}

check_file "${MODELS_DIR}/infinitetalk/Wan2_1-InfiniTetalk-Single_fp16.safetensors"
check_file "${MODELS_DIR}/diffusion_models/wan2.1-i2v-14b-720p-Q8_0.gguf"
check_file "${MODELS_DIR}/text_encoders/umt5-xxl-enc-bf16.safetensors"
check_file "${MODELS_DIR}/vae/Wan2_1_VAE_bf16.safetensors"
check_file "${MODELS_DIR}/clip_vision/clip_vision_h.safetensors"
check_file "${MODELS_DIR}/wav2vec/wav2vec2-chinese-base_fp16.safetensors"
check_file "${MODELS_DIR}/loras/wan2.2/lightx2v_I2V_14B_480p_cfg_step_distill_rank128_bf16.safetensors"

echo ""
if [ $MISSING -eq 0 ]; then
    echo "All 7 models downloaded successfully!"
else
    echo "WARNING: ${MISSING} model(s) missing. Check the output above."
fi

echo ""
echo "Total size:"
du -sh "${MODELS_DIR}"
echo ""
echo "You can now terminate this pod. The Network Volume will retain the models."
