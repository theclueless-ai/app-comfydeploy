import { NextRequest, NextResponse } from "next/server";
import { runPosesWorkflowAsync } from "@/lib/runpod";
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

    // Convert image to base64 for sending to RunPod
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const imageBase64 = `data:${imageFile.type || "image/png"};base64,${buffer.toString("base64")}`;

    // Deep clone the workflow template
    const workflow = JSON.parse(JSON.stringify(posesWorkflow)) as Record<string, unknown>;

    // Send workflow + image to RunPod serverless
    // The handler will upload the image to ComfyUI and inject the filename into Node 99
    const { jobId } = await runPosesWorkflowAsync(workflow, imageBase64);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Poses workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run poses workflow" },
      { status: 500 }
    );
  }
}
