/**
 * RunPod Serverless API Integration
 * For executing ComfyUI workflows on RunPod serverless endpoints
 */

// Environment variable validation - lazy check at runtime
function getRunPodConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  // Only validate at runtime, not during build
  if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
    // Skip validation during build
  } else {
    if (!apiKey) {
      throw new Error("RUNPOD_API_KEY is not set in environment variables");
    }
    if (!endpointId) {
      throw new Error("RUNPOD_ENDPOINT_ID is not set in environment variables");
    }
  }

  return { apiKey: apiKey || "", endpointId: endpointId || "", baseUrl };
}

export interface RunPodJobResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
}

export interface RunPodStatusResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: {
    message?: string;
    images?: string[];
    status?: string;
  };
  error?: string;
}

/**
 * Vellum 2.0 Workflow Inputs
 * Maps to ComfyUI Deploy external nodes:
 * - Node 681: ComfyUIDeployExternalImage (input_image)
 * - Node 734: ComfyUIDeployExternalNumberSlider (strength_model) - LoRA strength
 * - Node 689: ComfyUIDeployExternalTextAny (scale_by) - Scale factor "2", "4", "8"
 */
export interface VellumWorkflowInput {
  input_image: string;    // Base64 data URI
  strength_model: number; // 0 to 1 (LoRA strength)
  scale_by: string;       // "2", "4", or "8"
}

/**
 * Convert a File to base64 data URI format
 */
export async function fileToBase64(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return `data:${file.type};base64,${base64}`;
  } catch (error) {
    console.error("File to base64 conversion error:", error);
    throw new Error("Failed to convert file to base64");
  }
}

/**
 * Build the workflow payload for the Vellum 2.0 upscaling workflow
 * Input names must match the ComfyUI Deploy external node IDs exactly
 */
function buildWorkflowPayload(input: VellumWorkflowInput) {
  return {
    input: {
      // These IDs must match the external node widget_values in the workflow
      input_image: input.input_image,
      strength_model: input.strength_model,
      scale_by: input.scale_by,
    },
  };
}

/**
 * Run a workflow on RunPod serverless (async)
 * Returns a job ID that can be used to check status
 */
export async function runWorkflowAsync(
  input: VellumWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildWorkflowPayload(input);

  console.log("=== RunPod API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);
  console.log("Strength Model:", input.strength_model);
  console.log("Scale By:", input.scale_by);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  console.log("Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Run a workflow on RunPod serverless (sync)
 * Waits for the result (with timeout)
 */
export async function runWorkflowSync(
  input: VellumWorkflowInput,
  timeoutMs: number = 300000 // 5 minutes default
): Promise<RunPodStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodConfig();
  const url = `${baseUrl}/${endpointId}/runsync`;

  const payload = buildWorkflowPayload(input);

  console.log("=== RunPod API Call (sync) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);
  console.log("Strength Model:", input.strength_model);
  console.log("Scale By:", input.scale_by);
  console.log("Timeout:", timeoutMs);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("RunPod API Error:", errorText);
      throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
    }

    const result: RunPodStatusResponse = await response.json();
    console.log("Sync result status:", result.status);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("RunPod request timed out");
    }
    throw error;
  }
}

/**
 * Check the status of a RunPod job
 */
export async function getJobStatus(jobId: string): Promise<RunPodStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodConfig();
  const url = `${baseUrl}/${endpointId}/status/${jobId}`;

  console.log("Checking job status:", jobId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Status API Error:", errorText);
    throw new Error(`RunPod status error: ${response.status} - ${errorText}`);
  }

  const result: RunPodStatusResponse = await response.json();
  console.log("Job status:", result.status);

  return result;
}

/**
 * Cancel a RunPod job
 */
export async function cancelJob(jobId: string): Promise<void> {
  const { apiKey, endpointId, baseUrl } = getRunPodConfig();
  const url = `${baseUrl}/${endpointId}/cancel/${jobId}`;

  console.log("Cancelling job:", jobId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Cancel API Error:", errorText);
    throw new Error(`RunPod cancel error: ${response.status} - ${errorText}`);
  }

  console.log("Job cancelled successfully");
}

/**
 * Map RunPod status to our app status
 */
export function mapRunPodStatus(
  runpodStatus: RunPodStatusResponse["status"]
): "queued" | "running" | "completed" | "failed" {
  switch (runpodStatus) {
    case "IN_QUEUE":
      return "queued";
    case "IN_PROGRESS":
      return "running";
    case "COMPLETED":
      return "completed";
    case "FAILED":
    case "CANCELLED":
      return "failed";
    default:
      return "running";
  }
}

/**
 * Extract images from RunPod output
 */
export function extractImagesFromOutput(
  output: RunPodStatusResponse["output"]
): Array<{ url: string; filename: string }> {
  if (!output?.images || !Array.isArray(output.images)) {
    return [];
  }

  return output.images.map((imageUrl, index) => ({
    url: imageUrl,
    filename: `vellum_output_${index + 1}.png`,
  }));
}
