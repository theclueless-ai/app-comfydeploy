import { ComfyDeployClient } from "comfydeploy";

if (!process.env.COMFYDEPLOY_API_KEY) {
  throw new Error("COMFYDEPLOY_API_KEY is not set in environment variables");
}

export const comfyDeployClient = new ComfyDeployClient({
  apiToken: process.env.COMFYDEPLOY_API_KEY,
});

export async function uploadFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get upload URL from ComfyDeploy
    const uploadInfo = await comfyDeployClient.getUploadUrl(
      file.type,
      buffer.length
    );

    if (!uploadInfo) {
      throw new Error("Failed to get upload URL");
    }

    // Upload file to the signed URL
    const uploadResponse = await fetch(uploadInfo.upload_url, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    return uploadInfo.download_url;
  } catch (error) {
    console.error("File upload error:", error);
    throw new Error("Failed to upload file to ComfyDeploy");
  }
}

export async function runWorkflow(
  deploymentId: string,
  inputs: Record<string, any>,
  webhookUrl?: string
): Promise<{ runId: string }> {
  try {
    const result = await comfyDeployClient.run({
      deployment_id: deploymentId,
      inputs,
      webhook: webhookUrl,
    });

    if (!result?.run_id) {
      throw new Error("No run ID returned from ComfyDeploy");
    }

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
