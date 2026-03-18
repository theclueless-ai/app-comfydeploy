import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/comfydeploy";

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

    // Map ComfyDeploy status to frontend status
    let resolvedStatus: string;

    if (rawStatus?.status === "success") {
      resolvedStatus = "completed";
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
