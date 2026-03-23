import { NextRequest, NextResponse } from "next/server";
import { uploadImage, queuePrompt } from "@/lib/comfyui-local";
import posesWorkflowTemplate from "@/lib/poses-workflow.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get the uploaded image
    const imageFile = formData.get("image") as File | null;
    if (!imageFile) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    // Upload image to local ComfyUI
    const arrayBuffer = await imageFile.arrayBuffer();
    const uploadedFilename = await uploadImage(
      arrayBuffer,
      imageFile.name || "reference.png",
      imageFile.type || "image/png"
    );

    // Clone workflow template and inject uploaded filename into Node 99 (LoadImage)
    type WorkflowNode = { inputs: Record<string, unknown> };
    const workflow = JSON.parse(JSON.stringify(posesWorkflowTemplate)) as Record<string, WorkflowNode>;

    const node99 = workflow["99"];
    if (node99) {
      node99.inputs.image = uploadedFilename;
    }

    // Submit to local ComfyUI
    const promptId = await queuePrompt(workflow as Record<string, unknown>);
    return NextResponse.json({ jobId: promptId });
  } catch (error) {
    console.error("Poses workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run poses workflow" },
      { status: 500 }
    );
  }
}
