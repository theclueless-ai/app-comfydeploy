import { NextRequest, NextResponse } from "next/server";
import { runPosesWorkflowAsync } from "@/lib/runpod";
import { uploadPosesInputToS3 } from "@/lib/s3";
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

    // Upload image to S3 so the RunPod handler can download it by key
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = imageFile.name || "input.png";
    const contentType = imageFile.type || "image/png";
    const s3Key = await uploadPosesInputToS3(buffer, filename, contentType);

    // Deep clone the workflow template
    const workflow = JSON.parse(JSON.stringify(posesWorkflow)) as Record<string, unknown>;

    // Send workflow + S3 key to RunPod serverless
    // The handler downloads the image from S3 using this key and injects it into Node 99
    const { jobId } = await runPosesWorkflowAsync(workflow, s3Key);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Poses workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run poses workflow" },
      { status: 500 }
    );
  }
}
