import { NextRequest, NextResponse } from "next/server";
import {
  getJobStatus,
  mapRunPodStatus,
  extractImagesFromOutput,
} from "@/lib/runpod";

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

    console.log("Checking Vellum job status:", jobId);

    // Get status from RunPod
    const runpodStatus = await getJobStatus(jobId);

    // Map status to our app format
    const status = mapRunPodStatus(runpodStatus.status);

    // Extract images if completed
    const images = extractImagesFromOutput(runpodStatus.output);

    const response: {
      jobId: string;
      status: string;
      images?: Array<{ url: string; filename: string }>;
      error?: string;
    } = {
      jobId,
      status,
    };

    if (images.length > 0) {
      response.images = images;
    }

    if (runpodStatus.error) {
      response.error = runpodStatus.error;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Vellum status check error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get status" },
      { status: 500 }
    );
  }
}
