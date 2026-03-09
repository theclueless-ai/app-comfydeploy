import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellum20WorkflowAsync, Vellum20WorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-upscale-v20.json";

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

    // Get the strength model (LoRA strength)
    const strengthModelStr = formData.get("strength_model");
    const strengthModel = strengthModelStr ? parseFloat(strengthModelStr as string) : 0.5;

    // Validate strength model
    if (isNaN(strengthModel) || strengthModel < 0 || strengthModel > 3) {
      return NextResponse.json(
        { error: "Strength model must be between 0 and 3" },
        { status: 400 }
      );
    }

    // Get the scale by value
    const scaleBy = formData.get("scale_by") as string;
    if (!scaleBy || !["2", "4", "8"].includes(scaleBy)) {
      return NextResponse.json(
        { error: "Scale by must be 2, 4, or 8" },
        { status: 400 }
      );
    }

    console.log("=== Vellum 2.0 (Legacy) Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Strength Model:", strengthModel);
    console.log("Scale By:", scaleBy);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    console.log("Image converted to base64, length:", imageBase64.length);

    // Build workflow input
    const workflowInput: Vellum20WorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      strength_model: strengthModel,
      scale_by: scaleBy,
    };

    // Run the workflow on RunPod
    const result = await runVellum20WorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum 2.0 workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
