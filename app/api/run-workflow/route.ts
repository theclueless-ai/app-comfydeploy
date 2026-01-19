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

    // Process inputs - handle both files and text values
    for (const key of formData.keys()) {
      const value = formData.get(key);

      // Check if it's a File object
      if (value instanceof File && value.size > 0) {
        try {
          console.log(`Converting ${key} to base64:`, value.name, value.type, value.size);
          const base64Data = await fileToBase64(value);
          inputs[key] = base64Data;
          console.log(`Successfully converted ${key}, base64 length:`, base64Data.length);
        } catch (error) {
          console.error(`Failed to convert ${key}:`, error);
          return NextResponse.json(
            { error: `Failed to process ${key}` },
            { status: 500 }
          );
        }
      } else if (typeof value === 'string' && value.trim() !== '') {
        // Handle text inputs (like select values)
        inputs[key] = value;
        console.log(`Added text input ${key}:`, value);
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
