import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellumMakeupWorkflowAsync, VellumMakeupWorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-makeup.json";

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

    // Get the makeup reference image
    const makeupFile = formData.get("makeup_ref");
    if (!makeupFile || !(makeupFile instanceof File) || makeupFile.size === 0) {
      return NextResponse.json(
        { error: "Makeup reference image is required" },
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

    console.log("=== Vellum Makeup Workflow Request ===");
    console.log("Model:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Makeup ref:", makeupFile.name, makeupFile.type, makeupFile.size);
    console.log("Scale By:", scaleBy);

    // Convert both images to base64
    const imageBase64 = await fileToBase64(imageFile);
    const makeupBase64 = await fileToBase64(makeupFile);

    const workflowInput: VellumMakeupWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      makeup_ref: makeupBase64,
      scale_by: scaleBy === "4K" ? 1 : 2,
    };

    const result = await runVellumMakeupWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum Makeup workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
