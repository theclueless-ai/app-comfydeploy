import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runWorkflowAsync, VellumWorkflowInput } from "@/lib/runpod";

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

    // Get the scale factor
    const scaleFactorStr = formData.get("scale_factor");
    const scaleFactor = scaleFactorStr ? parseFloat(scaleFactorStr as string) : 2;

    // Validate scale factor
    if (isNaN(scaleFactor) || scaleFactor < 0.1 || scaleFactor > 3) {
      return NextResponse.json(
        { error: "Scale factor must be between 0.1 and 3" },
        { status: 400 }
      );
    }

    console.log("=== Vellum 2.0 Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Scale Factor:", scaleFactor);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);
    console.log("Image converted to base64, length:", imageBase64.length);

    // Build workflow input
    const workflowInput: VellumWorkflowInput = {
      inputImage: imageBase64,
      scaleFactor: scaleFactor,
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
