import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/comfyui-local";
import { sanitizeErrorMessage } from "@/lib/error-messages";

// Output node IDs in the AI Talk workflow
const VIDEO_NODE_ID = "338"; // VHS_VideoCombine
const IMAGE_NODE_ID = "261"; // SaveImage (last frame for continuation)

export async function GET(request: NextRequest) {
  const promptId = request.nextUrl.searchParams.get("promptId");

  if (!promptId) {
    return NextResponse.json(
      { error: "Missing promptId parameter" },
      { status: 400 }
    );
  }

  try {
    const entry = await getHistory(promptId);

    // Not in history yet — still running
    if (!entry) {
      return NextResponse.json({ status: "running" });
    }

    const status = entry.status;

    // Check for errors
    if (status.status_str === "error") {
      const errorMsgs: string[] = [];
      for (const [nodeId, nodeOutput] of Object.entries(entry.outputs)) {
        if (nodeOutput.errors) {
          errorMsgs.push(`Node ${nodeId}: ${JSON.stringify(nodeOutput.errors)}`);
        }
      }
      return NextResponse.json({
        status: "failed",
        error: sanitizeErrorMessage(errorMsgs.join("; ") || "Workflow failed with unknown error"),
      });
    }

    // Check if completed
    if (status.completed) {
      const videos: Array<{ url: string; filename: string }> = [];
      const images: Array<{ url: string; filename: string }> = [];

      // Extract video from VHS_VideoCombine node (gifs key)
      const videoOutput = entry.outputs[VIDEO_NODE_ID];
      if (videoOutput?.gifs) {
        for (const vid of videoOutput.gifs) {
          const params = new URLSearchParams({
            filename: vid.filename,
            subfolder: vid.subfolder || "",
            type: vid.type || "output",
          });
          videos.push({
            url: `/api/ai-talk-video?${params.toString()}`,
            filename: vid.filename,
          });
        }
      }

      // Extract thumbnail image from SaveImage node
      const imageOutput = entry.outputs[IMAGE_NODE_ID];
      if (imageOutput?.images) {
        for (const img of imageOutput.images) {
          const params = new URLSearchParams({
            filename: img.filename,
            subfolder: img.subfolder || "",
            type: img.type || "output",
          });
          images.push({
            url: `/api/ai-talk-video?${params.toString()}`,
            filename: img.filename,
          });
        }
      }

      // Fallback: check all nodes for gifs or images if specific nodes didn't have any
      if (videos.length === 0 && images.length === 0) {
        for (const [, nodeOutput] of Object.entries(entry.outputs)) {
          if (nodeOutput.gifs) {
            for (const vid of nodeOutput.gifs) {
              const params = new URLSearchParams({
                filename: vid.filename,
                subfolder: vid.subfolder || "",
                type: vid.type || "output",
              });
              videos.push({
                url: `/api/ai-talk-video?${params.toString()}`,
                filename: vid.filename,
              });
            }
          }
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              const params = new URLSearchParams({
                filename: img.filename,
                subfolder: img.subfolder || "",
                type: img.type || "output",
              });
              images.push({
                url: `/api/ai-talk-video?${params.toString()}`,
                filename: img.filename,
              });
            }
          }
        }
      }

      return NextResponse.json({
        status: "completed",
        videos,
        images: videos.length > 0 ? videos : images,
      });
    }

    // Still running
    return NextResponse.json({ status: "running" });
  } catch (error) {
    console.error("AI Talk status error:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error instanceof Error ? error.message : null) },
      { status: 500 }
    );
  }
}
