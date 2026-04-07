import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellumPielWorkflowAsync, VellumPielWorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-piel.json";

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

    // Get the scale by value (4K or 8K)
    const scaleBy = formData.get("scale_by") as string;
    if (!scaleBy || !["4K", "8K"].includes(scaleBy)) {
      return NextResponse.json(
        { error: "Scale by must be 4K or 8K" },
        { status: 400 }
      );
    }

    console.log("=== Vellum Piel Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Scale By:", scaleBy, "→ node 261 value:", scaleBy === "4K" ? 1 : 2);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    console.log("Image converted to base64, length:", imageBase64.length);

    // Build workflow input (scale_by = 1 for 4K, 2 for 8K — node 261 INTConstant)
    const workflowInput: VellumPielWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      scale_by: scaleBy === "4K" ? 1 : 2,
    };

    // Run the workflow on RunPod
    const result = await runVellumPielWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum Piel workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}