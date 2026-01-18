import { NextRequest, NextResponse } from "next/server";
import { fileToBase64, runWorkflow } from "@/lib/comfydeploy";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Get deployment ID from environment variable
    const deploymentId = process.env.COMFYDEPLOY_DEPLOYMENT_ID;

    if (!deploymentId) {
      return NextResponse.json(
        { error: "COMFYDEPLOY_DEPLOYMENT_ID is not configured" },
        { status: 500 }
      );
    }

    const inputs: Record<string, any> = {};

    // Convert files to base64 and prepare inputs
    for (const key of formData.keys()) {
      const file = formData.get(key) as File;
      if (file && file.size > 0) {
        try {
          console.log(`Converting ${key} to base64:`, file.name, file.type, file.size);
          const base64Data = await fileToBase64(file);
          inputs[key] = base64Data;
          console.log(`Successfully converted ${key}, base64 length:`, base64Data.length);
        } catch (error) {
          console.error(`Failed to convert ${key}:`, error);
          return NextResponse.json(
            { error: `Failed to process ${key}` },
            { status: 500 }
          );
        }
      }
    }

    // Construct webhook URL
    const webhookUrl = `${process.env.WEBHOOK_BASE_URL || request.nextUrl.origin}/api/webhook`;

    console.log("Running workflow with:");
    console.log("- Deployment ID:", deploymentId);
    console.log("- Input keys:", Object.keys(inputs));
    console.log("- Webhook URL:", webhookUrl);

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
