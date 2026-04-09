import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellumPeloWorkflowAsync, VellumPeloWorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-pelo.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get the model image
    const imageFile = formData.get("input_image");
    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Model image is required" },
        { status: 400 }
      );
    }

    // Get the hair reference image
    const peloFile = formData.get("pelo_ref");
    if (!peloFile || !(peloFile instanceof File) || peloFile.size === 0) {
      return NextResponse.json(
        { error: "Hair reference image is required" },
        { status: 400 }
      );
    }

    // Get the scale by value (4K or 8K)
    const scaleBy = formData.get("scale_by") as string;
    if (!scaleBy || !["4K", "8K"].includes(scaleBy)) {
      return NextResponse.json(
        { error: "Scale by must be 4K or 8K" },
        { status: 400 }
      );
    }

    console.log("=== Vellum Pelo Workflow Request ===");
    console.log("Model:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Pelo ref:", peloFile.name, peloFile.type, peloFile.size);
    console.log("Scale By:", scaleBy);

    // Convert both images to base64
    const imageBase64 = await fileToBase64(imageFile);
    const peloBase64 = await fileToBase64(peloFile);

    const workflowInput: VellumPeloWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      pelo_ref: peloBase64,
      scale_by: scaleBy === "4K" ? 1 : 2,
    };

    const result = await runVellumPeloWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum Pelo workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
