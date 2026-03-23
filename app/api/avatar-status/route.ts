import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/comfyui-local";

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "Missing jobId parameter" },
      { status: 400 }
    );
  }

  try {
    const entry = await getHistory(jobId);

    // Not in history yet — still queued/running
    if (!entry) {
      return NextResponse.json({ status: "running" });
    }

    if (entry.status.status_str === "error") {
      return NextResponse.json({
        status: "failed",
        error: "Avatar generation failed in ComfyUI",
      });
    }

    if (entry.status.completed) {
      const images: Array<{ url: string; filename: string }> = [];
      for (const nodeOutput of Object.values(entry.outputs)) {
        if (nodeOutput.images) {
          for (const img of nodeOutput.images) {
            const params = new URLSearchParams({
              filename: img.filename,
              subfolder: img.subfolder,
              type: img.type,
            });
            images.push({
              url: `/api/avatar-image?${params.toString()}`,
              filename: img.filename,
            });
          }
        }
      }
      return NextResponse.json({ status: "completed", images });
    }

    return NextResponse.json({ status: "running" });
  } catch (error) {
    console.error("Avatar status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check avatar status" },
      { status: 500 }
    );
  }
}
