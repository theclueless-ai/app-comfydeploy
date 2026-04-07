import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellumPecasWorkflowAsync, VellumPecasWorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-pecas.json";

/**
 * Map freckle level to ImpactSwitch select (1-3).
 * Node 268 options: 1=Pocas, 2=Muchas, 3=Muchísimas
 */
const FRECKLE_MAP: Record<string, number> = {
  "Pocas": 1,
  "Muchas": 2,
  "Muchísimas": 3,
};

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

    // Get the freckle level
    const freckleLevel = formData.get("freckle_level") as string;
    if (!freckleLevel || !FRECKLE_MAP[freckleLevel]) {
      return NextResponse.json(
        { error: "Freckle level must be Pocas, Muchas, or Muchísimas" },
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

    const freckleSelect = FRECKLE_MAP[freckleLevel];

    console.log("=== Vellum Pecas Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Freckle level:", freckleLevel, "→ select:", freckleSelect);
    console.log("Scale By:", scaleBy);

    // Convert image to base64
    const imageBase64 = await fileToBase64(imageFile);

    const workflowInput: VellumPecasWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      scale_by: scaleBy === "4K" ? 1 : 2,
      freckle_select: freckleSelect,
    };

    const result = await runVellumPecasWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum Pecas workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
