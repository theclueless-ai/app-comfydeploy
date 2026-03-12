#!/bin/bash
set -e
echo "Configuring model paths..."

link_model_dir() {
    local source="$1"
    local target="$2"
    if [ -d "$source" ] && [ ! -L "$target" ]; then
        rm -rf "$target" 2>/dev/null || true
        ln -sfn "$source" "$target"
        echo "  Linked: $target -> $source"
    fi
}

if [ -d "/runpod-volume/models" ]; then
    echo "Network volume detected"

    # Create all directories
    mkdir -p /runpod-volume/models/checkpoints/Sdxl
    mkdir -p /runpod-volume/models/unet/Zit
    mkdir -p /runpod-volume/models/unet/Klein
    mkdir -p /runpod-volume/models/clip
    mkdir -p /runpod-volume/models/vae/Flux
    mkdir -p /runpod-volume/models/vae/Flux2
    mkdir -p /runpod-volume/models/loras/sDXL
    mkdir -p /runpod-volume/models/loras/Z-Image
    mkdir -p /runpod-volume/models/loras/SDXL
    mkdir -p /runpod-volume/models/SEEDVR2
    mkdir -p /runpod-volume/models/controlnet

    # Symlink model directories
    link_model_dir "/runpod-volume/models/checkpoints" "/comfyui/models/checkpoints"
    link_model_dir "/runpod-volume/models/unet" "/comfyui/models/unet"
    link_model_dir "/runpod-volume/models/clip" "/comfyui/models/clip"
    link_model_dir "/runpod-volume/models/vae" "/comfyui/models/vae"
    link_model_dir "/runpod-volume/models/loras" "/comfyui/models/loras"
    link_model_dir "/runpod-volume/models/SEEDVR2" "/comfyui/models/SEEDVR2"
    link_model_dir "/runpod-volume/models/controlnet" "/comfyui/models/controlnet"
else
    echo "No network volume detected - using local model storage"
fi

echo "Model configuration completed"
