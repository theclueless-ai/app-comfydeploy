import { ComfyDeployClient } from "comfydeploy";

if (!process.env.COMFYDEPLOY_API_KEY) {
  throw new Error("COMFYDEPLOY_API_KEY is not set in environment variables");
}

export const comfyDeployClient = new ComfyDeployClient({
  apiToken: process.env.COMFYDEPLOY_API_KEY,
});

/**
 * Convert a File to base64 data URI format
 * ComfyDeploy accepts images as base64 strings in format: data:image/png;base64,xxxxx
 */
export async function fileToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Return as data URI format
    return `data:${file.type};base64,${base64}`;
  } catch (error) {
    console.error("File to base64 conversion error:", error);
    throw new Error("Failed to convert file to base64");
  }
}

export async function runWorkflow(
  deploymentId: string,
  inputs: Record<string, any>,
  webhookUrl?: string
): Promise<{ runId: string }> {
  try {
    console.log("Calling ComfyDeploy API with:");
    console.log("- deployment_id:", deploymentId);
    console.log("- inputs:", Object.keys(inputs));
    console.log("- webhook:", webhookUrl);

    const result = await comfyDeployClient.run({
      deployment_id: deploymentId,
      inputs,
      webhook: webhookUrl,
    });

    console.log("ComfyDeploy API response:", result);

    if (!result?.run_id) {
      throw new Error("No run ID returned from ComfyDeploy");
    }

    console.log("Workflow started successfully with run_id:", result.run_id);

    return {
      runId: result.run_id,
    };
  } catch (error) {
    console.error("Workflow run error:", error);
    throw new Error("Failed to run workflow");
  }
}

export async function getRunStatus(runId: string) {
  try {
    const result = await comfyDeployClient.getRun(runId);
    return result;
  } catch (error) {
    console.error("Get run status error:", error);
    throw new Error("Failed to get run status");
  }
}
