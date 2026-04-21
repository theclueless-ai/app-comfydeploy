import { NextRequest, NextResponse } from "next/server";
import {
  getVellumWorkflowsJobStatus,
  mapRunPodStatus,
  extractAudioFromOutput,
} from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";

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

    const runpodStatus = await getVellumWorkflowsJobStatus(jobId);
    const status = mapRunPodStatus(runpodStatus.status);
    const audios = extractAudioFromOutput(runpodStatus.output);

    const response: {
      jobId: string;
      status: string;
      audios?: Array<{ url: string; filename: string }>;
      error?: string;
    } = {
      jobId,
      status,
    };

    if (audios.length > 0) {
      response.audios = audios;
    }

    if (runpodStatus.error) {
      console.error("Video Translate job failed. Raw error:", runpodStatus.error);
      response.error = sanitizeErrorMessage(runpodStatus.error);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Video Translate status check error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
