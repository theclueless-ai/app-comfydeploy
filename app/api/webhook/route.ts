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

// Normalized payload for frontend
interface WebhookResult {
  runId: string;
  status: string;
  images?: Array<{
    url: string;
    filename: string;
  }>;
  error?: string;
}

// Store webhook results in memory (for production, use a database)
const webhookResults = new Map<string, WebhookResult>();

export async function POST(request: NextRequest) {
  try {
    const payload: ComfyDeployWebhookPayload = await request.json();

    console.log("=== Webhook received ===");
    console.log("Raw payload:", JSON.stringify(payload, null, 2));

    // Extract all images from outputs
    const allImages: Array<{ url: string; filename: string }> = [];
    if (payload.outputs) {
      for (const output of payload.outputs) {
        if (output.data.images) {
          allImages.push(...output.data.images);
        }
      }
    }

    // Normalize to frontend format
    const normalizedResult: WebhookResult = {
      runId: payload.run_id,
      status: payload.status === "success" ? "completed" : payload.status === "failed" ? "failed" : payload.status,
      images: allImages.length > 0 ? allImages : undefined,
    };

    console.log("Normalized result:", normalizedResult);
    console.log(`Found ${allImages.length} images in webhook`);

    // Store the result
    webhookResults.set(payload.run_id, normalizedResult);

    // Clean up old results after 1 hour
    setTimeout(() => {
      webhookResults.delete(payload.run_id);
    }, 60 * 60 * 1000);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

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

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json(
      { error: "Missing runId parameter" },
      { status: 400 }
    );
  }

  const result = webhookResults.get(runId);

  if (!result) {
    return NextResponse.json(
      { status: "pending", message: "No result yet" },
      { status: 200 }
    );
  }

  // If completed, verify all images are actually accessible on S3
  if (result.status === "completed" && result.images?.length) {
    const checks = await Promise.all(result.images.map((img) => isImageReady(img.url)));
    const allReady = checks.every(Boolean);

    if (!allReady) {
      console.log("Webhook: images not all ready yet —", result.images.map((img, i) => `${img.filename}: ${checks[i]}`));
      return NextResponse.json({ status: "running" });
    }
  }

  return NextResponse.json(result);
}
