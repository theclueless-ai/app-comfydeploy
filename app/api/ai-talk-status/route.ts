import { NextRequest, NextResponse } from "next/server";
import { mapRunPodStatus } from "@/lib/runpod";

// RunPod config for AI Talk endpoint
function getRunPodConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AITALK_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  return { apiKey: apiKey || "", endpointId: endpointId || "", baseUrl };
}

/**
 * Extract videos from RunPod output
 * AI Talk returns video files instead of images
 */
function extractVideosFromOutput(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
): Array<{ url: string; filename: string }> {
  if (!output) {
    console.log("extractVideosFromOutput: output is null/undefined");
    return [];
  }

  const videos: Array<{ url: string; filename: string }> = [];

  // Check for nested output.output structure (common RunPod pattern)
  const actualOutput = output.output || output;

  // Format 1: videos array
  if (actualOutput.videos && Array.isArray(actualOutput.videos)) {
    console.log("extractVideosFromOutput: Found videos array with", actualOutput.videos.length, "items");
    for (const video of actualOutput.videos) {
      if (video.url) {
        videos.push({
          url: video.url,
          filename: video.filename || extractFilenameFromUrl(video.url),
        });
      }
    }
  }

  // Format 2: images array (the workflow might save as images)
  if (actualOutput.images && Array.isArray(actualOutput.images)) {
    console.log("extractVideosFromOutput: Found images array with", actualOutput.images.length, "items");
    for (const item of actualOutput.images) {
      if (item.url) {
        videos.push({
          url: item.url,
          filename: item.filename || extractFilenameFromUrl(item.url),
        });
      }
    }
  }

  // Format 3: video_url (single video URL)
  if (actualOutput.video_url && typeof actualOutput.video_url === "string") {
    console.log("extractVideosFromOutput: Found video_url:", actualOutput.video_url);
    videos.push({
      url: actualOutput.video_url,
      filename: extractFilenameFromUrl(actualOutput.video_url),
    });
  }

  // Format 4: s3_url (single S3 URL)
  if (actualOutput.s3_url && typeof actualOutput.s3_url === "string") {
    console.log("extractVideosFromOutput: Found s3_url:", actualOutput.s3_url);
    videos.push({
      url: actualOutput.s3_url,
      filename: extractFilenameFromUrl(actualOutput.s3_url),
    });
  }

  // Format 5: Search for any S3 URL or video URL in output values
  if (videos.length === 0) {
    console.log("extractVideosFromOutput: Searching for URLs in output...");
    for (const [key, value] of Object.entries(actualOutput)) {
      if (typeof value === "string" && isMediaUrl(value)) {
        console.log(`extractVideosFromOutput: Found URL in field '${key}':`, value);
        videos.push({
          url: value,
          filename: extractFilenameFromUrl(value),
        });
      }
    }
  }

  console.log("extractVideosFromOutput: Total videos found:", videos.length);
  return videos;
}

/**
 * Extract filename from a URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "video.mp4";
  } catch {
    return "video.mp4";
  }
}

/**
 * Check if a URL looks like a media URL (video or image)
 */
function isMediaUrl(url: string): boolean {
  try {
    const lower = url.toLowerCase();
    return (
      lower.includes(".mp4") ||
      lower.includes(".webm") ||
      lower.includes(".mov") ||
      lower.includes(".avi") ||
      lower.includes(".png") ||
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".webp") ||
      lower.includes("s3.") ||
      lower.includes("amazonaws.com")
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const { apiKey, endpointId, baseUrl } = getRunPodConfig();

    if (!apiKey || !endpointId) {
      return NextResponse.json(
        { error: "RunPod configuration is missing" },
        { status: 500 }
      );
    }

    console.log("Checking AI Talk job status:", jobId);

    const url = `${baseUrl}/${endpointId}/status/${jobId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod Status API Error:", errorText);
      return NextResponse.json(
        { error: `RunPod status error: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const runpodStatus = await response.json();

    // Log the full output for debugging
    console.log("RunPod full response:", JSON.stringify(runpodStatus, null, 2));
    console.log("RunPod output:", JSON.stringify(runpodStatus.output, null, 2));

    // Map status to our app format
    const status = mapRunPodStatus(runpodStatus.status);

    // Extract videos/images from output
    const videos = extractVideosFromOutput(runpodStatus.output);
    console.log("Extracted videos:", videos.length, videos);

    const result: {
      jobId: string;
      status: string;
      videos?: Array<{ url: string; filename: string }>;
      images?: Array<{ url: string; filename: string }>;
      error?: string;
    } = {
      jobId,
      status,
    };

    if (videos.length > 0) {
      result.videos = videos;
      // Also set as images for compatibility with ResultDisplay
      result.images = videos;
    }

    if (runpodStatus.error) {
      result.error = runpodStatus.error;
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
