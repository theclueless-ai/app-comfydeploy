import { NextRequest, NextResponse } from "next/server";
import {
  fileToBase64,
  runVideoTranslateWorkflowAsync,
  VideoTranslateWorkflowInput,
} from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/video-translate.json";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const videoFile = formData.get("input_video");
    if (!videoFile || !(videoFile instanceof File) || videoFile.size === 0) {
      return NextResponse.json(
        { error: "Input video is required" },
        { status: 400 }
      );
    }

    if (!videoFile.type.startsWith("video/")) {
      return NextResponse.json(
        { error: "Input must be a video file" },
        { status: 400 }
      );
    }

    console.log("=== Video Translate Workflow Request ===");
    console.log("Video:", videoFile.name, videoFile.type, videoFile.size);

    const videoBase64 = await fileToBase64(videoFile);
    console.log("Video converted to base64, length:", videoBase64.length);

    const workflowInput: VideoTranslateWorkflowInput = {
      workflow: workflow,
      input_video: videoBase64,
    };

    const result = await runVideoTranslateWorkflowAsync(workflowInput);

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
    });
  } catch (error) {
    console.error("Video Translate workflow execution error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
