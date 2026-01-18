import { NextRequest, NextResponse } from "next/server";
import { getRunStatus } from "@/lib/comfydeploy";

export async function GET(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const { runId } = params;

    if (!runId) {
      return NextResponse.json(
        { error: "Missing run ID" },
        { status: 400 }
      );
    }

    const status = await getRunStatus(runId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get run status" },
      { status: 500 }
    );
  }
}
