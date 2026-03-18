import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/comfydeploy";

/**
 * Verify an image URL is actually available AND contains real data on S3.
 * ComfyDeploy can mark a run as "success" while S3 still has empty/placeholder
 * files. A real upscaled image (2048×2048) is at least ~50 KB; blank/corrupt
 * placeholders are typically < 1 KB.
 */
const MIN_IMAGE_BYTES = 10_000; // 10 KB – any real image is larger than this

async function isImageReady(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (!res.ok) return false;

    const cl = res.headers.get("content-length");
    if (cl && parseInt(cl, 10) < MIN_IMAGE_BYTES) {
      console.log(`Image not ready — content-length ${cl} bytes (< ${MIN_IMAGE_BYTES}): ${url}`);
      return false;
    }
    return true;
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
      // ALWAYS verify every image is reachable AND has real content before
      // marking completed — don't rely on live_status which is unreliable.
      if (allImages.length > 0) {
        const checks = await Promise.all(allImages.map((img) => isImageReady(img.url)));
        const allReady = checks.every(Boolean);

        console.log("Image readiness:", allImages.map((img, i) => `${img.filename}: ${checks[i]}`));

        if (!allReady) {
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
