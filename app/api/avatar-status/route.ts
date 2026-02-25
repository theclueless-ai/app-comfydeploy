import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/comfyui-local";

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
        error: errorMsgs.join("; ") || "Workflow failed with unknown error",
      });
    }

    // Check if completed
    if (status.completed) {
      // Extract images from node 100 (SaveImage) output
      const images: Array<{ url: string; filename: string }> = [];

      // Check node 100 first (our SaveImage node)
      const saveNodeOutput = entry.outputs["100"];
      if (saveNodeOutput?.images) {
        for (const img of saveNodeOutput.images) {
          const params = new URLSearchParams({
            filename: img.filename,
            subfolder: img.subfolder || "",
            type: img.type || "output",
          });
          images.push({
            url: `/api/avatar-image?${params.toString()}`,
            filename: img.filename,
          });
        }
      }

      // Fallback: check all nodes for images if node 100 didn't have any
      if (images.length === 0) {
        for (const [, nodeOutput] of Object.entries(entry.outputs)) {
          if (nodeOutput.images) {
            for (const img of nodeOutput.images) {
              const params = new URLSearchParams({
                filename: img.filename,
                subfolder: img.subfolder || "",
                type: img.type || "output",
              });
              images.push({
                url: `/api/avatar-image?${params.toString()}`,
                filename: img.filename,
              });
            }
          }
        }
      }

      return NextResponse.json({
        status: "completed",
        images,
      });
    }

    // Still running
    return NextResponse.json({ status: "running" });
  } catch (error) {
    console.error("Avatar status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
