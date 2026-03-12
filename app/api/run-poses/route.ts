import { NextRequest, NextResponse } from "next/server";
import { runPosesWorkflowAsync } from "@/lib/runpod";
import { uploadImageForRunPod } from "@/lib/s3";

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

    // Upload image to S3 (avoids Vercel's ~4.5MB payload limit with base64)
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const { s3Key, bucket, region } = await uploadImageForRunPod(
      buffer,
      imageFile.name,
      imageFile.type || "image/png"
    );

    console.log("Poses image uploaded to S3:", s3Key);

    // Send S3 reference to RunPod (handler downloads image using its own credentials)
    const { jobId } = await runPosesWorkflowAsync({
      s3_key: s3Key,
      s3_bucket: bucket,
      s3_region: region,
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Poses workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run poses workflow" },
      { status: 500 }
    );
  }
}
