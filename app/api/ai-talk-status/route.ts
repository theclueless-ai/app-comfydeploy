import { NextRequest, NextResponse } from "next/server";
import {
  getAiTalkJobStatus,
  mapRunPodStatus,
  extractVideoFromAiTalkOutput,
} from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";

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

    console.log("Checking AI Talk RunPod status:", runId);

    const rawStatus = await getAiTalkJobStatus(runId);

    console.log("Raw RunPod status:", JSON.stringify(rawStatus, null, 2));

    // Map RunPod status to app status
    const status = mapRunPodStatus(rawStatus.status);

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

    // Extract video from output when completed
    if (status === "completed" && rawStatus.output) {
      const videos = extractVideoFromAiTalkOutput(rawStatus.output);
      if (videos.length > 0) {
        result.videos = videos;
        // Also set as images for compatibility with ResultDisplay
        result.images = videos;
      }
    }

    // Include sanitized error if failed (raw error stays in server logs)
    if (status === "failed") {
      console.error("AI Talk job failed. Raw error:", rawStatus.error);
      result.error = sanitizeErrorMessage(rawStatus.error);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Talk status check error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
