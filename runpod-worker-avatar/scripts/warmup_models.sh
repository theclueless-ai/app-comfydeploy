#!/bin/bash
echo "Starting model warmup..."

# Wait for ComfyUI
for i in $(seq 1 60); do
    if curl -s http://localhost:8188/system_stats >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

# =============================================================================
# Warmup 1: Lumina2/zImageTurbo models (used by Avatar)
# Generates a tiny image to force model loading into GPU
# =============================================================================
echo "Warmup 1: Loading Avatar models (zImageTurbo + qwen_3_4b)..."
WARMUP_AVATAR='{
  "1": {
    "inputs": {"unet_name": "Zit/zImageTurboAIO_zImageTurboFP16AIO.safetensors", "weight_dtype": "default"},
    "class_type": "UNETLoader"
  },
  "2": {
    "inputs": {"vae_name": "Flux/ae.safetensors"},
    "class_type": "VAELoader"
  },
  "3": {
    "inputs": {"clip_name": "qwen_3_4b.safetensors", "type": "lumina2", "device": "default"},
    "class_type": "CLIPLoader"
  },
  "4": {
    "inputs": {"width": 64, "height": 64, "batch_size": 1},
    "class_type": "EmptyLatentImage"
  },
  "5": {
    "inputs": {"text": "warmup test", "clip": ["3", 0]},
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "seed": 1, "steps": 1, "cfg": 1.0,
      "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0,
      "model": ["1", 0], "positive": ["5", 0], "negative": ["5", 0],
      "latent_image": ["4", 0]
    },
    "class_type": "KSampler"
  },
  "8": {
    "inputs": {"samples": ["7", 0], "vae": ["2", 0]},
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {"filename_prefix": "warmup_avatar", "images": ["8", 0]},
    "class_type": "SaveImage"
  }
}'

RESPONSE=$(curl -s -X POST http://localhost:8188/prompt \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": $WARMUP_AVATAR, \"client_id\": \"warmup\"}")
PROMPT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prompt_id',''))" 2>/dev/null)

if [ -n "$PROMPT_ID" ] && [ "$PROMPT_ID" != "" ]; then
    echo "  Warmup 1 started (prompt_id: $PROMPT_ID)"
    for i in $(seq 1 180); do
        QUEUE=$(curl -s http://localhost:8188/queue)
        RUNNING=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('queue_running',[])))" 2>/dev/null)
        PENDING=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('queue_pending',[])))" 2>/dev/null)
        if [ "$RUNNING" = "0" ] && [ "$PENDING" = "0" ]; then
            echo "  Warmup 1 completed - Avatar models loaded"
            break
        fi
        if [ $i -eq 180 ]; then
            echo "  Warmup 1 timeout after 180s"
            break
        fi
        sleep 1
    done
else
    echo "  Warmup 1 failed: $RESPONSE"
fi

# =============================================================================
# Warmup 2: Klein/Flux2 models (used by Poses)
# =============================================================================
echo "Warmup 2: Loading Poses models (flux-2-klein-9b + qwen_3_8b)..."
WARMUP_POSES='{
  "1": {
    "inputs": {"unet_name": "Klein/flux-2-klein-9b.safetensors", "weight_dtype": "default"},
    "class_type": "UNETLoader"
  },
  "2": {
    "inputs": {"vae_name": "Flux2/ae.safetensors"},
    "class_type": "VAELoader"
  },
  "3": {
    "inputs": {"clip_name": "qwen_3_8b_fp8mixed.safetensors", "type": "flux2", "device": "default"},
    "class_type": "CLIPLoader"
  },
  "4": {
    "inputs": {"width": 64, "height": 64, "batch_size": 1},
    "class_type": "EmptyLatentImage"
  },
  "5": {
    "inputs": {"text": "warmup test", "clip": ["3", 0]},
    "class_type": "CLIPTextEncode"
  },
  "7": {
    "inputs": {
      "seed": 1, "steps": 1, "cfg": 1.0,
      "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0,
      "model": ["1", 0], "positive": ["5", 0], "negative": ["5", 0],
      "latent_image": ["4", 0]
    },
    "class_type": "KSampler"
  },
  "8": {
    "inputs": {"samples": ["7", 0], "vae": ["2", 0]},
    "class_type": "VAEDecode"
  },
  "9": {
    "inputs": {"filename_prefix": "warmup_poses", "images": ["8", 0]},
    "class_type": "SaveImage"
  }
}'

RESPONSE=$(curl -s -X POST http://localhost:8188/prompt \
    -H "Content-Type: application/json" \
    -d "{\"prompt\": $WARMUP_POSES, \"client_id\": \"warmup\"}")
PROMPT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('prompt_id',''))" 2>/dev/null)

if [ -n "$PROMPT_ID" ] && [ "$PROMPT_ID" != "" ]; then
    echo "  Warmup 2 started (prompt_id: $PROMPT_ID)"
    for i in $(seq 1 180); do
        QUEUE=$(curl -s http://localhost:8188/queue)
        RUNNING=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('queue_running',[])))" 2>/dev/null)
        PENDING=$(echo "$QUEUE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('queue_pending',[])))" 2>/dev/null)
        if [ "$RUNNING" = "0" ] && [ "$PENDING" = "0" ]; then
            echo "  Warmup 2 completed - Poses models loaded"
            break
        fi
        if [ $i -eq 180 ]; then
            echo "  Warmup 2 timeout after 180s"
            break
        fi
        sleep 1
    done
else
    echo "  Warmup 2 failed: $RESPONSE"
fi

echo "Model warmup complete"
