import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runVellumOrbitalWorkflowAsync, VellumOrbitalWorkflowInput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/vellum-orbital.json";

const HORIZONTAL_OPTIONS = [
  "180° Izq",
  "135° Izq",
  "90° Izq",
  "45° Izq",
  "Centro (0°)",
  "45° Der",
  "90° Der",
  "135° Der",
  "180° Der",
];

const VERTICAL_OPTIONS = [
  "-90° (Suelo)",
  "-60° (Bajo ext.)",
  "-45° (Bajo)",
  "-20° (Bajo suave)",
  "Centro (0°)",
  "+20° (Alto suave)",
  "+45° (Alto)",
  "+60° (Alto ext.)",
  "+90° (Techo)",
];

const ZOOM_OPTIONS = ["Close-up", "Normal", "Wide"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Input image
    const imageFile = formData.get("input_image");
    if (!imageFile || !(imageFile instanceof File) || imageFile.size === 0) {
      return NextResponse.json(
        { error: "Input image is required" },
        { status: 400 }
      );
    }

    // Horizontal angle
    const horizontalStr = formData.get("horizontal") as string;
    const horizontalIndex = HORIZONTAL_OPTIONS.indexOf(horizontalStr);
    if (horizontalIndex === -1) {
      return NextResponse.json(
        { error: `Invalid horizontal value. Valid: ${HORIZONTAL_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Vertical angle
    const verticalStr = formData.get("vertical") as string;
    const verticalIndex = VERTICAL_OPTIONS.indexOf(verticalStr);
    if (verticalIndex === -1) {
      return NextResponse.json(
        { error: `Invalid vertical value. Valid: ${VERTICAL_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Zoom
    const zoomStr = formData.get("zoom") as string;
    const zoomIndex = ZOOM_OPTIONS.indexOf(zoomStr);
    if (zoomIndex === -1) {
      return NextResponse.json(
        { error: `Invalid zoom value. Valid: ${ZOOM_OPTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Scale
    const scaleBy = formData.get("scale_by") as string;
    if (!scaleBy || !["4K", "8K"].includes(scaleBy)) {
      return NextResponse.json(
        { error: "Scale by must be 4K or 8K" },
        { status: 400 }
      );
    }

    console.log("=== Vellum Orbital Workflow Request ===");
    console.log("Image:", imageFile.name, imageFile.type, imageFile.size);
    console.log("Horizontal:", horizontalStr, "→ select:", horizontalIndex + 1);
    console.log("Vertical:", verticalStr, "→ select:", verticalIndex + 1);
    console.log("Zoom:", zoomStr, "→ select:", zoomIndex + 1);
    console.log("Scale By:", scaleBy);

    const imageBase64 = await fileToBase64(imageFile);

    const workflowInput: VellumOrbitalWorkflowInput = {
      workflow: workflow,
      input_image: imageBase64,
      scale_by: scaleBy === "4K" ? 1 : 2,
      horizontal_select: horizontalIndex + 1,
      vertical_select: verticalIndex + 1,
      zoom_select: zoomIndex + 1,
    };

    const result = await runVellumOrbitalWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Vellum Orbital workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
