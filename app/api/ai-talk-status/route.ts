import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/comfydeploy";

/**
 * Extract videos/media from ComfyDeploy outputs
 * AI Talk returns video files from VHS_VideoCombine node
 */
function extractMediaFromOutputs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  outputs: any[]
): Array<{ url: string; filename: string }> {
  const media: Array<{ url: string; filename: string }> = [];

  if (!outputs || !Array.isArray(outputs)) {
    return media;
  }

  for (const output of outputs) {
    const data = output.data || output;

    // Check for videos array
    if (data.videos && Array.isArray(data.videos)) {
      for (const video of data.videos) {
        if (video.url) {
          media.push({
            url: video.url,
            filename: video.filename || "video.mp4",
          });
        }
      }
    }

    // Check for images array (fallback, some nodes output as images)
    if (data.images && Array.isArray(data.images)) {
      for (const image of data.images) {
        if (image.url) {
          media.push({
            url: image.url,
            filename: image.filename || "output.png",
          });
        }
      }
    }

    // Check for gifs array (VHS_VideoCombine may output as gifs)
    if (data.gifs && Array.isArray(data.gifs)) {
      for (const gif of data.gifs) {
        if (gif.url) {
          media.push({
            url: gif.url,
            filename: gif.filename || "video.mp4",
          });
        }
      }
    }
  }

  return media;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const runId = searchParams.get("runId");

    if (!runId) {
      return NextResponse.json(
        { error: "Run ID is required" },
        { status: 400 }
      );
    }

    console.log("Checking AI Talk ComfyDeploy status:", runId);

    const rawStatus = await getRunStatus(runId);

    console.log("Raw ComfyDeploy status:", JSON.stringify(rawStatus, null, 2));

    // Extract media from outputs
    const media = extractMediaFromOutputs(rawStatus?.outputs || []);
    console.log("Extracted media:", media.length, media);

    // Map ComfyDeploy status to app status
    const statusMap: Record<string, string> = {
      success: "completed",
      failed: "failed",
      running: "running",
      "not-started": "queued",
      queued: "queued",
    };
    const status = statusMap[rawStatus?.status || ""] || rawStatus?.status || "queued";

    const result: {
      runId: string;
      status: string;
      videos?: Array<{ url: string; filename: string }>;
      images?: Array<{ url: string; filename: string }>;
      error?: string;
    } = {
      runId,
      status,
    };

    if (media.length > 0) {
      result.videos = media;
      // Also set as images for compatibility with ResultDisplay
      result.images = media;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Talk status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
