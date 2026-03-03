import { NextRequest, NextResponse } from "next/server";
import { queuePrompt, uploadImage, uploadAudio } from "@/lib/comfyui-local";
import aiTalkWorkflow from "@/lib/ai-talk-workflow.json";
import { sanitizeErrorMessage } from "@/lib/error-messages";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get the image file
    const imageFile = formData.get("input_image");
    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Input image is required" },
        { status: 400 }
      );
    }

    // Get mode from frontend (explicit choice)
    const modeParam = formData.get("mode");
    const mode = modeParam === "sts" ? "sts" : "tts";

    // Get the audio file (required for STS mode)
    const audioFile = formData.get("input_audio");

    // Get the text input (required for TTS mode)
    const inputText = formData.get("input_text");

    // Validate mode-specific inputs
    const hasAudio = audioFile && audioFile instanceof File && audioFile.size > 0;
    const hasText = inputText && typeof inputText === "string" && inputText.trim() !== "";

    if (mode === "sts" && !hasAudio) {
      return NextResponse.json(
        { error: "Audio file is required for Voice Changer mode" },
        { status: 400 }
      );
    }

    if (mode === "tts" && !hasText) {
      return NextResponse.json(
        { error: "Text is required for Text-to-Speech mode" },
        { status: 400 }
      );
    }

    // Get the positive prompt
    const positivePrompt = formData.get("positive_prompt");
    if (!positivePrompt || typeof positivePrompt !== "string" || positivePrompt.trim() === "") {
      return NextResponse.json(
        { error: "Positive prompt is required" },
        { status: 400 }
      );
    }

    // Get voice ID
    const voiceId = formData.get("voice_id");
    const selectedVoiceId = voiceId && typeof voiceId === "string" && voiceId.trim() !== ""
      ? voiceId.trim()
      : "gdMFOufuI36UmxNKJhtv";

    console.log("=== AI Talk Local ComfyUI Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Mode:", mode);
    if (hasAudio) console.log("Audio:", (audioFile as File).name, (audioFile as File).type, (audioFile as File).size);
    if (hasText) console.log("Text:", (inputText as string).substring(0, 100) + "...");
    console.log("Positive Prompt:", positivePrompt.substring(0, 100) + "...");
    console.log("Voice ID:", selectedVoiceId);

    // Upload image to local ComfyUI
    const imageBuffer = await imageFile.arrayBuffer();
    const uploadedImageName = await uploadImage(imageBuffer, imageFile.name, imageFile.type || "image/png");

    // Upload audio if STS mode
    let uploadedAudioName = "";
    if (mode === "sts" && hasAudio) {
      const audioBuffer = await (audioFile as File).arrayBuffer();
      uploadedAudioName = await uploadAudio(audioBuffer, (audioFile as File).name, (audioFile as File).type || "audio/wav");
    }

    // Deep clone the workflow template
    const workflow = JSON.parse(JSON.stringify(aiTalkWorkflow)) as Record<string, Record<string, Record<string, unknown>>>;

    // Inject image into LoadImage node (229)
    workflow["229"]["inputs"]["image"] = uploadedImageName;

    // Inject positive prompt into ComfyUIDeployExternalText node (328)
    workflow["328"]["inputs"]["default_value"] = positivePrompt.trim();

    // Inject voice ID into all relevant nodes
    workflow["331"]["inputs"]["default_value"] = selectedVoiceId;
    workflow["295"]["inputs"]["voice_id"] = selectedVoiceId;
    workflow["333"]["inputs"]["voice_id"] = selectedVoiceId;

    // Inject text for TTS node
    workflow["332"]["inputs"]["default_value"] = hasText ? (inputText as string).trim() : "";

    // Handle TTS vs STS mode switching
    if (mode === "tts") {
      // Rewire audio path: bypass voice changer, use TTS output directly
      workflow["214"]["inputs"]["audio_1"] = ["333", 0];
      workflow["361"]["inputs"]["audio"] = ["333", 0];
    } else {
      // STS mode: set audio file for voice changer input
      workflow["330"]["inputs"]["audio_file"] = uploadedAudioName;
    }

    // Inject ElevenLabs API key from environment if available
    const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsKey) {
      workflow["295"]["inputs"]["api_key"] = elevenLabsKey;
      workflow["333"]["inputs"]["api_key"] = elevenLabsKey;
    }

    console.log("Queuing AI Talk workflow in local ComfyUI...");

    // Queue the prompt in local ComfyUI
    const promptId = await queuePrompt(workflow as unknown as Record<string, unknown>);

    console.log("AI Talk prompt queued with ID:", promptId);

    return NextResponse.json({ promptId });
  } catch (error) {
    console.error("AI Talk workflow error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
