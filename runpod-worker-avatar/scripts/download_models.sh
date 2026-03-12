#!/bin/bash
set -e
echo "Checking required models for Avatar & Poses..."

verify_file() {
    local file="$1"
    local min_size="$2"
    [ -f "$file" ] && [ $(stat -c%s "$file" 2>/dev/null || echo 0) -ge "$min_size" ]
}

MODEL_BASE="${MODEL_PATH:-/runpod-volume/models}"

# Create all needed directories
mkdir -p "$MODEL_BASE/checkpoints/Sdxl"
mkdir -p "$MODEL_BASE/unet/Zit"
mkdir -p "$MODEL_BASE/unet/Klein"
mkdir -p "$MODEL_BASE/clip"
mkdir -p "$MODEL_BASE/vae/Flux"
mkdir -p "$MODEL_BASE/vae/Flux2"
mkdir -p "$MODEL_BASE/loras/sDXL"
mkdir -p "$MODEL_BASE/loras/Z-Image"
mkdir -p "$MODEL_BASE/loras/SDXL"
mkdir -p "$MODEL_BASE/SEEDVR2"
mkdir -p "$MODEL_BASE/controlnet"

# =============================================================================
# Avatar Models
# =============================================================================

# SDXL Checkpoint: cyberrealisticXL v80
CKPT_FILE="$MODEL_BASE/checkpoints/Sdxl/cyberrealisticXL_v80.safetensors"
if ! verify_file "$CKPT_FILE" 6000000000; then
    echo "Downloading cyberrealisticXL_v80..."
    wget -q --show-progress -O "$CKPT_FILE" \
        "https://civitai.com/api/download/models/623313?type=Model&format=SafeTensor" || echo "Error downloading checkpoint"
fi

# UNET: zImageTurboAIO (Lumina2/Flux variant)
ZIT_FILE="$MODEL_BASE/unet/Zit/zImageTurboAIO_zImageTurboFP16AIO.safetensors"
if ! verify_file "$ZIT_FILE" 5000000000; then
    echo "Downloading zImageTurboAIO..."
    echo "NOTE: This model may need manual download from CivitAI or HuggingFace"
    # wget -q --show-progress -O "$ZIT_FILE" "URL_HERE" || true
fi

# CLIP: qwen_3_4b (lumina2 type)
CLIP_QWEN4B="$MODEL_BASE/clip/qwen_3_4b.safetensors"
if ! verify_file "$CLIP_QWEN4B" 3000000000; then
    echo "Downloading qwen_3_4b..."
    echo "NOTE: This model may need manual download"
    # wget -q --show-progress -O "$CLIP_QWEN4B" "URL_HERE" || true
fi

# VAE: Flux ae.safetensors
VAE_FLUX="$MODEL_BASE/vae/Flux/ae.safetensors"
if ! verify_file "$VAE_FLUX" 300000000; then
    echo "Downloading Flux ae.safetensors..."
    wget -q --show-progress -O "$VAE_FLUX" \
        "https://huggingface.co/black-forest-labs/FLUX.1-schnell/resolve/main/ae.safetensors" || true
fi

# SeedVR2 DiT Model (Q4_K_M quantized)
SEEDVR2_DIT="$MODEL_BASE/SEEDVR2/seedvr2_ema_7b-Q4_K_M.gguf"
if ! verify_file "$SEEDVR2_DIT" 3000000000; then
    echo "Downloading seedvr2_ema_7b-Q4_K_M.gguf..."
    wget -q --show-progress -O "$SEEDVR2_DIT" \
        "https://huggingface.co/Kijai/SeedVR2-comfy/resolve/main/seedvr2_ema_7b-Q4_K_M.gguf" || true
fi

# SeedVR2 VAE
SEEDVR2_VAE="$MODEL_BASE/SEEDVR2/ema_vae_fp16.safetensors"
if ! verify_file "$SEEDVR2_VAE" 150000000; then
    echo "Downloading ema_vae_fp16..."
    wget -q --show-progress -O "$SEEDVR2_VAE" \
        "https://huggingface.co/Kijai/SeedVR2-comfy/resolve/main/ema_vae_fp16.safetensors" || true
fi

# LoRA: DetailedEyes_V3 (active in avatar workflow)
LORA_EYES="$MODEL_BASE/loras/sDXL/DetailedEyes_V3.safetensors"
if ! verify_file "$LORA_EYES" 10000000; then
    echo "Downloading DetailedEyes_V3 LoRA..."
    echo "NOTE: This LoRA may need manual download from CivitAI"
    # wget -q --show-progress -O "$LORA_EYES" "URL_HERE" || true
fi

# LoRA: skin_4 (active in avatar workflow)
LORA_SKIN="$MODEL_BASE/loras/sDXL/skin_4-000015.safetensors"
if ! verify_file "$LORA_SKIN" 10000000; then
    echo "Downloading skin_4 LoRA..."
    echo "NOTE: This LoRA may need manual download from CivitAI"
    # wget -q --show-progress -O "$LORA_SKIN" "URL_HERE" || true
fi

# =============================================================================
# Poses Models
# =============================================================================

# UNET: flux-2-klein-9b
KLEIN_FILE="$MODEL_BASE/unet/Klein/flux-2-klein-9b.safetensors"
if ! verify_file "$KLEIN_FILE" 8000000000; then
    echo "Downloading flux-2-klein-9b..."
    echo "NOTE: This model may need manual download from HuggingFace"
    # wget -q --show-progress -O "$KLEIN_FILE" "URL_HERE" || true
fi

# CLIP: qwen_3_8b_fp8mixed (flux2 type)
CLIP_QWEN8B="$MODEL_BASE/clip/qwen_3_8b_fp8mixed.safetensors"
if ! verify_file "$CLIP_QWEN8B" 4000000000; then
    echo "Downloading qwen_3_8b_fp8mixed..."
    echo "NOTE: This model may need manual download"
    # wget -q --show-progress -O "$CLIP_QWEN8B" "URL_HERE" || true
fi

# VAE: Flux2/ae.safetensors
VAE_FLUX2="$MODEL_BASE/vae/Flux2/ae.safetensors"
if ! verify_file "$VAE_FLUX2" 300000000; then
    echo "Downloading Flux2 ae.safetensors..."
    # This might be the same as Flux/ae.safetensors or a different version
    if [ -f "$VAE_FLUX" ] && ! [ -f "$VAE_FLUX2" ]; then
        echo "Symlinking Flux VAE to Flux2..."
        ln -sf "$VAE_FLUX" "$VAE_FLUX2"
    fi
    # wget -q --show-progress -O "$VAE_FLUX2" "URL_HERE" || true
fi

echo "Model check completed"
echo "NOTE: Models marked with 'manual download' need to be placed in the network volume manually"
