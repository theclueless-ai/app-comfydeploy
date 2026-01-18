import { ComfyDeploy } from "comfydeploy";

if (!process.env.COMFYDEPLOY_API_KEY) {
  throw new Error("COMFYDEPLOY_API_KEY is not set in environment variables");
}

export const comfyDeployClient = new ComfyDeploy({
  bearerAuth: process.env.COMFYDEPLOY_API_KEY,
});

export async function uploadFile(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });

    const result = await comfyDeployClient.file.upload({
      file: blob as any,
    });

    if (result.upload?.fileUrl) {
      return result.upload.fileUrl;
    }

    throw new Error("Failed to upload file");
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
    const result = await comfyDeployClient.run.create({
      deploymentId,
      inputs,
      webhook: webhookUrl,
    });

    if (!result.runResponse?.runId) {
      throw new Error("No run ID returned from ComfyDeploy");
    }

    return {
      runId: result.runResponse.runId,
    };
  } catch (error) {
    console.error("Workflow run error:", error);
    throw new Error("Failed to run workflow");
  }
}

export async function getRunStatus(runId: string) {
  try {
    const result = await comfyDeployClient.run.get({
      runId,
    });

    return result.runResponse;
  } catch (error) {
    console.error("Get run status error:", error);
    throw new Error("Failed to get run status");
  }
}
