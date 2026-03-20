import { NextRequest, NextResponse } from "next/server";
import {
  fileToBase64 as runpodFileToBase64,
  runAiTalkWorkflowAsync,
} from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";

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

    // Get the audio file (always required in new workflow)
    const audioFile = formData.get("input_audio");
    if (!audioFile || !(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio file is required" },
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
      : "JBFqnCBsd6RMkjVDRZzb"; // Default voice ID

    // Whether to run audio through ElevenLabs Voice Changer
    // "No" = bypass (pre-generated ElevenLabs audio); anything else = use Voice Changer
    const useElevenLabsVC = formData.get("use_elevenlabs_vc") !== "No";

    console.log("=== AI Talk RunPod Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Audio:", audioFile.name, audioFile.type, audioFile.size);
    console.log("Positive Prompt:", positivePrompt.substring(0, 100) + "...");
    console.log("Voice ID:", selectedVoiceId);
    console.log("Use ElevenLabs VC:", useElevenLabsVC);

    // Convert files to base64
    const imageBase64 = await runpodFileToBase64(imageFile);
    const audioBase64 = await runpodFileToBase64(audioFile);

    console.log("Running AI Talk workflow via RunPod:");
    console.log("- Endpoint ID:", endpointId);

    const result = await runAiTalkWorkflowAsync({
      input_image: imageBase64,
      input_audio: audioBase64,
      positive_prompt: positivePrompt.trim(),
      voice_id: selectedVoiceId,
      use_elevenlabs_vc: useElevenLabsVC,
    });

    return NextResponse.json({
      success: true,
      runId: result.jobId,
    });
  } catch (error) {
    console.error("AI Talk workflow execution error:", error);
    const message = error instanceof Error ? error.message : null;
    const isEndpointNotFound = message?.includes("endpoint not found");
    return NextResponse.json(
      {
        error: sanitizeErrorMessage(message),
        code: isEndpointNotFound ? "ENDPOINT_NOT_FOUND" : "EXECUTION_ERROR",
      },
      { status: isEndpointNotFound ? 502 : 500 }
    );
  }
}
