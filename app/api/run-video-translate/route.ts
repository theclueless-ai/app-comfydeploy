import { NextRequest, NextResponse } from "next/server";
import {
  fileToBase64,
  runVideoTranslateWorkflowAsync,
  VideoTranslateWorkflowInput,
} from "@/lib/runpod";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import workflow from "@/lib/video-translate.json";

export const maxDuration = 60;

const SUPPORTED_AUDIO_EXTS = ["mp3", "wav", "flac", "m4a", "ogg"];

function audioExtensionFromFile(file: File): string {
  const nameExt = file.name.includes(".")
    ? file.name.split(".").pop()!.toLowerCase()
    : "";
  if (SUPPORTED_AUDIO_EXTS.includes(nameExt)) return nameExt;

  const mime = file.type.toLowerCase();
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("flac")) return "flac";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4") || mime.includes("m4a") || mime.includes("aac")) return "m4a";
  return "mp3";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const mediaTypeRaw = formData.get("media_type");
    const mediaType =
      typeof mediaTypeRaw === "string" && mediaTypeRaw === "audio" ? "audio" : "video";

    console.log("=== Video Translate Workflow Request ===");
    console.log("Media type:", mediaType);

    if (mediaType === "audio") {
      const audioFile = formData.get("input_audio");
      if (!audioFile || !(audioFile instanceof File) || audioFile.size === 0) {
        return NextResponse.json(
          { error: "Input audio is required" },
          { status: 400 }
        );
      }

      if (!audioFile.type.startsWith("audio/")) {
        return NextResponse.json(
          { error: "Input must be an audio file" },
          { status: 400 }
        );
      }

      console.log("Audio:", audioFile.name, audioFile.type, audioFile.size);

      const audioBase64 = await fileToBase64(audioFile);
      console.log("Audio converted to base64, length:", audioBase64.length);

      const workflowInput: VideoTranslateWorkflowInput = {
        workflow: workflow,
        media_type: "audio",
        input_audio: audioBase64,
        audio_extension: audioExtensionFromFile(audioFile),
      };

      const result = await runVideoTranslateWorkflowAsync(workflowInput);
      return NextResponse.json({ success: true, jobId: result.jobId });
    }

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

    console.log("Video:", videoFile.name, videoFile.type, videoFile.size);

    const videoBase64 = await fileToBase64(videoFile);
    console.log("Video converted to base64, length:", videoBase64.length);

    const workflowInput: VideoTranslateWorkflowInput = {
      workflow: workflow,
      media_type: "video",
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
