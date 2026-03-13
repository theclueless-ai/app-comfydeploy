import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/comfydeploy";

/** HEAD-check that an image URL is actually available on S3 */
async function isImageReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    if (!runId) {
      return NextResponse.json(
        { error: "Missing run ID" },
        { status: 400 }
      );
    }

    const rawStatus = await getRunStatus(runId);

    console.log("Raw status from ComfyDeploy:", rawStatus);

    // Extract all images from outputs
    const allImages: Array<{ url: string; filename: string }> = [];
    if (rawStatus?.outputs) {
      for (const output of rawStatus.outputs) {
        if (output.data?.images) {
          allImages.push(...output.data.images);
        }
      }
    }

    // Determine if the workflow is truly done
    let resolvedStatus: string;

    if (rawStatus?.status === "success") {
      // ComfyDeploy says "success" but images may still be uploading to S3.
      // Check live_status and verify images are actually accessible.
      const stillSaving =
        typeof rawStatus.live_status === "string" &&
        rawStatus.live_status.toLowerCase().includes("save");

      if (stillSaving && allImages.length > 0) {
        // Verify every image is reachable before marking completed
        const checks = await Promise.all(allImages.map((img) => isImageReady(img.url)));
        const allReady = checks.every(Boolean);

        console.log("Image readiness:", allImages.map((img, i) => `${img.filename}: ${checks[i]}`));

        if (!allReady) {
          // Tell the frontend to keep polling
          console.log("Images not all ready yet — reporting as running");
          resolvedStatus = "running";
        } else {
          resolvedStatus = "completed";
        }
      } else {
        resolvedStatus = "completed";
      }
    } else if (rawStatus?.status === "failed") {
      resolvedStatus = "failed";
    } else {
      resolvedStatus = rawStatus?.status || "pending";
    }

    const normalizedStatus = {
      runId,
      status: resolvedStatus,
      images: resolvedStatus === "completed" && allImages.length > 0 ? allImages : undefined,
    };

    console.log("Normalized status:", normalizedStatus);

    return NextResponse.json(normalizedStatus);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get run status" },
      { status: 500 }
    );
  }
}
