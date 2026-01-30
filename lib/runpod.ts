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
    status?: string;
    images?: Array<{
      filename: string;
      url: string;
      dimensions: [number, number];
      file_size_mb: number;
    }>;
    original_size?: [number, number];
    scaleFactor?: number;
    skin_texture_intensity?: number;
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
  workflow : any;
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
 * Maps app fields to RunPod handler expected fields:
 * - image: base64 image (without data URI prefix)
 * - scaleFactor: number (2, 4, or 8)
 * - skin_texture_intensity: number (0 to 1)
 */
function buildWorkflowPayload(input: VellumWorkflowInput) {
  // Remove data URI prefix if present (handler expects raw base64)
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      scaleFactor: parseInt(input.scale_by, 10),
      skin_texture_intensity: input.strength_model,
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
  console.log("Skin Texture Intensity:", input.strength_model);
  console.log("Scale Factor:", input.scale_by);

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
  console.log("Skin Texture Intensity:", input.strength_model);
  console.log("Scale Factor:", input.scale_by);
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

  return output.images.map((image) => ({
    url: image.url,
    filename: image.filename,
  }));
}
