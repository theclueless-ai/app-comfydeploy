import { NextRequest, NextResponse } from "next/server";
import {
  fileToBase64 as runpodFileToBase64,
  runAiTalkWorkflowAsync,
  AiTalkWorkflowInput,
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

    const imageFile = formData.get("input_image");
    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Input image is required" },
        { status: 400 }
      );
    }

    const audioFile = formData.get("input_audio");
    if (!audioFile || !(audioFile instanceof File) || audioFile.size === 0) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const readOptionalString = (key: string): string | undefined => {
      const raw = formData.get(key);
      if (typeof raw !== "string") return undefined;
      const trimmed = raw.trim();
      return trimmed === "" ? undefined : trimmed;
    };

    const promptPrefix = readOptionalString("prompt_prefix");
    const promptPrefixMan = readOptionalString("prompt_prefix_man");
    const resolution = readOptionalString("resolution");
    const model = readOptionalString("model");

    console.log("=== AI Talk RunPod Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Audio:", audioFile.name, audioFile.type, audioFile.size);
    console.log("Resolution:", resolution || "default");
    console.log("Model:", model || "default");

    const imageBase64 = await runpodFileToBase64(imageFile);
    const audioBase64 = await runpodFileToBase64(audioFile);

    console.log("Running AI Talk workflow via RunPod:");
    console.log("- Endpoint ID:", endpointId);

    const payload: AiTalkWorkflowInput = {
      input_image: imageBase64,
      input_audio: audioBase64,
    };
    if (promptPrefix) payload.prompt_prefix = promptPrefix;
    if (promptPrefixMan) payload.prompt_prefix_man = promptPrefixMan;
    if (resolution) payload.resolution = resolution;
    if (model) payload.model = model;

    const result = await runAiTalkWorkflowAsync(payload);

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
