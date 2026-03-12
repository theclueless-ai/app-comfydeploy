import { NextRequest, NextResponse } from "next/server";
import { getAvatarJobStatus, mapRunPodStatus, extractImagesFromOutput } from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing jobId parameter" },
      { status: 400 }
    );
  }

  try {
    const rawStatus = await getAvatarJobStatus(jobId);
    const appStatus = mapRunPodStatus(rawStatus.status);

    if (appStatus === "completed") {
      const images = extractImagesFromOutput(rawStatus.output);
      return NextResponse.json({
        status: "completed",
        images,
      });
    }

    if (appStatus === "failed") {
      return NextResponse.json({
        status: "failed",
        error: sanitizeErrorMessage(rawStatus.error || "Poses generation failed on RunPod"),
      });
    }

    return NextResponse.json({ status: appStatus });
  } catch (error) {
    console.error("Poses status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check poses status" },
      { status: 500 }
    );
  }
}
