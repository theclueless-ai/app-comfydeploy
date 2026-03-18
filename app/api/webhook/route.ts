import { NextRequest, NextResponse } from "next/server";

// ComfyDeploy webhook payload structure
interface ComfyDeployWebhookPayload {
  run_id: string;
  status: "not-started" | "running" | "uploading" | "success" | "failed" | "started" | "queued" | "timeout";
  outputs?: Array<{
    data: {
      images?: Array<{
        url: string;
        filename: string;
      }>;
      files?: Array<{
        url: string;
        filename: string;
      }>;
      gifs?: Array<{
        url: string;
        filename: string;
      }>;
      text?: string[];
    };
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const payload: ComfyDeployWebhookPayload = await request.json();

    console.log("=== Webhook received ===");
    console.log("Run ID:", payload.run_id);
    console.log("Status:", payload.status);

    // Count images for logging
    let imageCount = 0;
    if (payload.outputs) {
      for (const output of payload.outputs) {
        if (output.data.images) {
          imageCount += output.data.images.length;
        }
      }
    }
    console.log(`Images in payload: ${imageCount}`);

    // The webhook is received by ComfyDeploy to update run status.
    // The frontend polls /api/status/[runId] which queries ComfyDeploy
    // directly, so we just acknowledge receipt here.
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
