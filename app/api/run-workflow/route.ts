import { NextRequest, NextResponse } from "next/server";
import { uploadFile, runWorkflow } from "@/lib/comfydeploy";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const deploymentId = formData.get("deploymentId") as string;
    const inputsJson = formData.get("inputs") as string;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "Missing deployment ID" },
        { status: 400 }
      );
    }

    const inputConfig = JSON.parse(inputsJson || "[]");
    const inputs: Record<string, any> = {};

    // Upload files and prepare inputs
    for (const key of formData.keys()) {
      if (key !== "deploymentId" && key !== "inputs") {
        const file = formData.get(key) as File;
        if (file && file.size > 0) {
          try {
            const fileUrl = await uploadFile(file);
            inputs[key] = fileUrl;
          } catch (error) {
            console.error(`Failed to upload ${key}:`, error);
            return NextResponse.json(
              { error: `Failed to upload ${key}` },
              { status: 500 }
            );
          }
        }
      }
    }

    // Construct webhook URL
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || request.nextUrl.origin}/api/webhook`;

    // Run the workflow
    const result = await runWorkflow(deploymentId, inputs, webhookUrl);

    return NextResponse.json({
      success: true,
      runId: result.runId,
    });
  } catch (error) {
    console.error("Workflow execution error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run workflow" },
      { status: 500 }
    );
  }
}
