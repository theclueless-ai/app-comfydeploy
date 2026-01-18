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
    const apiBase = comfyDeployClient.apiBase || "https://www.comfydeploy.com/api";
    const url = `${apiBase}/run`;

    const payload = {
      deployment_id: deploymentId,
      inputs,
      webhook: webhookUrl,
    };

    console.log("=== ComfyDeploy API Call ===");
    console.log("URL:", url);
    console.log("Method: POST");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("API Token present:", !!process.env.COMFYDEPLOY_API_KEY);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.COMFYDEPLOY_API_KEY}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    console.log("Response status:", response.status);
    console.log("Response statusText:", response.statusText);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`ComfyDeploy API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log("Response body:", responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse response:", parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`);
    }

    console.log("Parsed result:", result);

    if (!result?.run_id) {
      throw new Error("No run ID in response");
    }

    console.log("✅ Workflow started successfully with run_id:", result.run_id);

    return {
      runId: result.run_id,
    };
  } catch (error) {
    console.error("Workflow run error:", error);
    if (error instanceof Error) {
      throw error;
    }
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
