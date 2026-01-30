import { NextRequest, NextResponse } from "next/server";
// import { fileToBase64 } from "@/lib/comfydeploy";
import { fileToBase64, runWorkflowAsync, VellumWorkflowInput } from "@/lib/runpod";
import workflow from "@/lib/vellum-upscale.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get deployment ID from environment variable
    const deploymentId = process.env.COMFYDEPLOY_VELLUM_DEPLOYMENT_ID;
    const apiKey = process.env.COMFYDEPLOY_API_KEY;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "COMFYDEPLOY_VELLUM_DEPLOYMENT_ID is not configured" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "COMFYDEPLOY_API_KEY is not configured" },
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

    // Get the strength model (LoRA strength)
    const strengthModelStr = formData.get("strength_model");
    const strengthModel = strengthModelStr ? parseFloat(strengthModelStr as string) : 0.5;

    // Validate strength model
    if (isNaN(strengthModel) || strengthModel < 0 || strengthModel > 1) {
      return NextResponse.json(
        { error: "Strength model must be between 0 and 1" },
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

    console.log("=== Vellum 2.0 Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Strength Model:", strengthModel);
    console.log("Scale By:", scaleBy);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    console.log("Image converted to base64, length:", imageBase64.length);

    // Build workflow input
    const workflowInput: VellumWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      strength_model: strengthModel,
      scale_by: scaleBy,
    };

    // Run the workflow on RunPod
    const result = await runWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run workflow" },
      { status: 500 }
    );
  }
}
