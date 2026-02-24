import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runWorkflow } from "@/lib/comfydeploy";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const deploymentId = process.env.COMFYDEPLOY_AITALK_DEPLOYMENT_ID;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "COMFYDEPLOY_AITALK_DEPLOYMENT_ID is not configured" },
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

    // Get the audio file
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
      : "gdMFOufuI36UmxNKJhtv"; // Default voice ID

    console.log("=== AI Talk ComfyDeploy Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Audio:", audioFile.name, audioFile.type, audioFile.size);
    console.log("Positive Prompt:", positivePrompt.substring(0, 100) + "...");
    console.log("Voice ID:", selectedVoiceId);

    // Convert image to base64 data URI
    const imageBase64 = await fileToBase64(imageFile);

    // Convert audio to base64 data URI
    const audioBase64 = await fileToBase64(audioFile);

    const inputs: Record<string, string> = {
      input_image: imageBase64,
      input_audio: audioBase64,
      voice_id: selectedVoiceId,
      positive_prompt: positivePrompt.trim(),
    };

    // Construct webhook URL
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || request.nextUrl.origin}/api/webhook`;

    console.log("Running AI Talk workflow with:");
    console.log("- Deployment ID:", deploymentId);
    console.log("- Input keys:", Object.keys(inputs));
    console.log("- Webhook URL:", webhookUrl);

    const result = await runWorkflow(deploymentId, inputs, webhookUrl);

    return NextResponse.json({
      success: true,
      runId: result.runId,
    });
  } catch (error) {
    console.error("AI Talk workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run workflow" },
      { status: 500 }
    );
  }
}
