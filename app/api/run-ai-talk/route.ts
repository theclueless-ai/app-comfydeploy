import { NextRequest, NextResponse } from "next/server";
import { fileToBase64 } from "@/lib/runpod";
import workflow from "@/lib/ai-talk-workflow.json";

// RunPod config for AI Talk endpoint
function getRunPodConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AITALK_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  return { apiKey: apiKey || "", endpointId: endpointId || "", baseUrl };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const { apiKey, endpointId, baseUrl } = getRunPodConfig();

    if (!endpointId) {
      return NextResponse.json(
        { error: "RUNPOD_AITALK_ENDPOINT_ID is not configured" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "RUNPOD_API_KEY is not configured" },
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

    // Get the speech text
    const speechText = formData.get("speech_text");
    if (!speechText || typeof speechText !== "string" || speechText.trim() === "") {
      return NextResponse.json(
        { error: "Speech text is required" },
        { status: 400 }
      );
    }

    // Get the voice ID (optional, will use default if not provided)
    const voiceId = formData.get("voice_id");
    const selectedVoiceId = voiceId && typeof voiceId === "string" && voiceId.trim() !== ""
      ? voiceId.trim()
      : "gdMFOufuI36UmxNKJhtv"; // Default voice ID

    console.log("=== AI Talk Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Speech Text:", speechText.substring(0, 100) + "...");
    console.log("Voice ID:", selectedVoiceId);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    // Remove data URI prefix for raw base64
    let rawBase64 = imageBase64;
    if (rawBase64.includes(",")) {
      rawBase64 = rawBase64.split(",")[1];
    }
    console.log("Image converted to base64, length:", rawBase64.length);

    // Build the workflow with inputs
    // Clone workflow to avoid mutating the original
    const workflowWithInputs = JSON.parse(JSON.stringify(workflow));

    // Set the base64 image in node 737 (easy loadImageBase64)
    if (workflowWithInputs["737"]) {
      workflowWithInputs["737"].inputs.base64_data = rawBase64;
    }

    // Set the speech text and voice ID in node 250 (ElevenlabsTextToSpeech)
    if (workflowWithInputs["250"]) {
      workflowWithInputs["250"].inputs.text = speechText;
      workflowWithInputs["250"].inputs.voice_id = selectedVoiceId;
    }

    // Build payload for RunPod
    const payload = {
      input: {
        workflow: workflowWithInputs,
      },
    };

    const url = `${baseUrl}/${endpointId}/run`;

    console.log("Sending to RunPod:", url);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod API Error:", errorText);
      return NextResponse.json(
        { error: `RunPod API error: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log("Job started with ID:", result.id);

    return NextResponse.json({
      success: true,
      jobId: result.id,
    });
  } catch (error) {
    console.error("AI Talk workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run workflow" },
      { status: 500 }
    );
  }
}
