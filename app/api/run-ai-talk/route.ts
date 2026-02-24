import { NextRequest, NextResponse } from "next/server";
import {
  fileToBase64 as runpodFileToBase64,
  runAiTalkWorkflowAsync,
} from "@/lib/runpod";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const endpointId = process.env.RUNPOD_AITALK_ENDPOINT_ID;

    if (!endpointId) {
      return NextResponse.json(
        { error: "RUNPOD_AITALK_ENDPOINT_ID is not configured" },
        { status: 500 }
      );
    }

    // Get the image file
    const imageFile = formData.get("input_image");
    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Input image is required" },
        { status: 400 }
      );
    }

    // Get the audio file (optional for TTS mode, required for STS mode)
    const audioFile = formData.get("input_audio");

    // Get the text input (for TTS mode)
    const inputText = formData.get("input_text");

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
      : "gdMFOufuI36UmxNKJhtv"; // Default voice ID

    // Determine mode based on inputs
    const hasAudio = audioFile && audioFile instanceof File && audioFile.size > 0;
    const hasText = inputText && typeof inputText === "string" && inputText.trim() !== "";
    const mode = hasAudio && !hasText ? "sts" : "tts";

    console.log("=== AI Talk RunPod Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Mode:", mode);
    if (hasAudio) console.log("Audio:", (audioFile as File).name, (audioFile as File).type, (audioFile as File).size);
    if (hasText) console.log("Text:", (inputText as string).substring(0, 100) + "...");
    console.log("Positive Prompt:", positivePrompt.substring(0, 100) + "...");
    console.log("Voice ID:", selectedVoiceId);

    // Convert image to base64 data URI
    const imageBase64 = await runpodFileToBase64(imageFile);

    // Convert audio to base64 if provided
    let audioBase64 = "";
    if (hasAudio) {
      audioBase64 = await runpodFileToBase64(audioFile as File);
    }

    console.log("Running AI Talk workflow via RunPod:");
    console.log("- Endpoint ID:", endpointId);
    console.log("- Mode:", mode);

    const result = await runAiTalkWorkflowAsync({
      input_image: imageBase64,
      input_audio: audioBase64 || undefined,
      input_text: hasText ? (inputText as string).trim() : undefined,
      voice_id: selectedVoiceId,
      positive_prompt: positivePrompt.trim(),
      mode,
    });

    return NextResponse.json({
      success: true,
      runId: result.jobId,
    });
  } catch (error) {
    console.error("AI Talk workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run workflow" },
      { status: 500 }
    );
  }
}
