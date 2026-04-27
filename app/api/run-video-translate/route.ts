import { NextRequest, NextResponse } from "next/server";
import {
  runVideoTranslateWorkflowAsync,
  VideoTranslateWorkflowInput,
} from "@/lib/runpod";
import { isVideoTranslateUploadKey } from "@/lib/s3";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/video-translate.json";

export const maxDuration = 60;

const SUPPORTED_AUDIO_EXTS = ["mp3", "wav", "flac", "m4a", "ogg"];

function audioExtensionFromKey(key: string): string {
  const ext = key.includes(".")
    ? key.split(".").pop()!.toLowerCase()
    : "";
  if (SUPPORTED_AUDIO_EXTS.includes(ext)) return ext;
  return "mp3";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Expected JSON body with s3_key and media_type" },
        { status: 400 }
      );
    }

    const { s3_key, media_type, audio_extension } = body as {
      s3_key?: unknown;
      media_type?: unknown;
      audio_extension?: unknown;
    };

    if (typeof s3_key !== "string" || !isVideoTranslateUploadKey(s3_key)) {
      return NextResponse.json(
        { error: "s3_key is required and must be a video-translate upload key" },
        { status: 400 }
      );
    }

    const mediaType = media_type === "audio" ? "audio" : "video";

    console.log("=== Video Translate Workflow Request ===");
    console.log("Media type:", mediaType);
    console.log("S3 key:", s3_key);

    const workflowInput: VideoTranslateWorkflowInput = {
      workflow,
      media_type: mediaType,
      s3_key,
      audio_extension:
        mediaType === "audio"
          ? typeof audio_extension === "string"
            ? audio_extension
            : audioExtensionFromKey(s3_key)
          : undefined,
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
