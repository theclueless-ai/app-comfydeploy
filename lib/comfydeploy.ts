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

    console.log("Attempting to get upload URL for:", file.name, file.type, buffer.length);
    console.log("API Token present:", !!process.env.COMFYDEPLOY_API_KEY);
    console.log("API Base:", comfyDeployClient.apiBase || "https://www.comfydeploy.com/api");

    // Make direct fetch call to see the actual error
    const apiBase = comfyDeployClient.apiBase || "https://www.comfydeploy.com/api";
    const url = new URL(`${apiBase}/upload-url`);
    url.searchParams.set("type", file.type);
    url.searchParams.set("file_size", buffer.length.toString());

    console.log("Fetching upload URL from:", url.href);

    const response = await fetch(url.href, {
      method: "GET",
      headers: {
        authorization: `Bearer ${process.env.COMFYDEPLOY_API_KEY}`,
      },
      cache: "no-store",
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      throw new Error(`Failed to get upload URL: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log("Response text:", responseText);

    let uploadInfo;
    try {
      uploadInfo = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
    }

    console.log("Upload info received:", uploadInfo);

    if (!uploadInfo || !uploadInfo.upload_url || !uploadInfo.download_url) {
      throw new Error("Invalid upload info structure");
    }

    // Upload file to the signed URL
    console.log("Uploading to signed URL:", uploadInfo.upload_url);
    const uploadResponse = await fetch(uploadInfo.upload_url, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Upload failed with status:", uploadResponse.status, errorText);
      throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`);
    }

    console.log("File uploaded successfully, download URL:", uploadInfo.download_url);
    return uploadInfo.download_url;
  } catch (error) {
    console.error("File upload error:", error);
    if (error instanceof Error) {
      throw error;
    }
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
