import { NextRequest, NextResponse } from "next/server";
import { WebhookPayload } from "@/lib/types";

// Store webhook results in memory (for production, use a database)
const webhookResults = new Map<string, WebhookPayload>();

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    console.log("Webhook received:", payload);

    // Store the result
    if (payload.runId) {
      webhookResults.set(payload.runId, payload);

      // Clean up old results after 1 hour
      setTimeout(() => {
        webhookResults.delete(payload.runId);
      }, 60 * 60 * 1000);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");

  if (!runId) {
    return NextResponse.json(
      { error: "Missing runId parameter" },
      { status: 400 }
    );
  }

  const result = webhookResults.get(runId);

  if (!result) {
    return NextResponse.json(
      { status: "pending", message: "No result yet" },
      { status: 200 }
    );
  }

  return NextResponse.json(result);
}
