import { NextRequest, NextResponse } from "next/server";
import { queuePrompt, uploadImage } from "@/lib/comfyui-local";
import posesWorkflow from "@/lib/poses-workflow.json";

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

    // Upload the image to local ComfyUI
    const imageBuffer = await imageFile.arrayBuffer();
    const uploadedFilename = await uploadImage(
      imageBuffer,
      imageFile.name,
      imageFile.type || "image/png"
    );

    // Deep clone the workflow template
    const workflow = JSON.parse(JSON.stringify(posesWorkflow)) as Record<string, Record<string, Record<string, unknown>>>;

    // Inject the uploaded image filename into Node 99 (LoadImage)
    workflow["99"]["inputs"]["image"] = uploadedFilename;

    // Queue the prompt in local ComfyUI
    const promptId = await queuePrompt(workflow as unknown as Record<string, unknown>);

    return NextResponse.json({ promptId });
  } catch (error) {
    console.error("Poses workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run poses workflow" },
      { status: 500 }
    );
  }
}
