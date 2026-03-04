import { NextRequest, NextResponse } from "next/server";
import { getHistory } from "@/lib/comfyui-local";

// SaveImage node IDs in the poses workflow
const SAVE_NODE_IDS = ["9", "119", "120", "121", "122", "123", "124", "125", "126"];

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
      const images: Array<{ url: string; filename: string }> = [];

      // Extract images from all SaveImage nodes
      for (const nodeId of SAVE_NODE_IDS) {
        const nodeOutput = entry.outputs[nodeId];
        if (nodeOutput?.images) {
          for (const img of nodeOutput.images) {
            const params = new URLSearchParams({
              filename: img.filename,
              subfolder: img.subfolder || "",
              type: img.type || "output",
            });
            images.push({
              url: `/api/poses-image?${params.toString()}`,
              filename: img.filename,
            });
          }
        }
      }

      // Fallback: check all nodes for images if specific nodes didn't have any
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
                url: `/api/poses-image?${params.toString()}`,
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
    console.error("Poses status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check status" },
      { status: 500 }
    );
  }
}
