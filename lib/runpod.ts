/**
 * RunPod Serverless API Integration
 * For executing ComfyUI workflows on RunPod serverless endpoints
 *
 * Supports two endpoints:
 * - Vellum (upscaling): RUNPOD_ENDPOINT_ID
 * - AI Talk (talking head video): RUNPOD_AITALK_ENDPOINT_ID
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

function getRunPodAiTalkConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AITALK_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not set in environment variables");
  }
  if (!endpointId) {
    throw new Error("RUNPOD_AITALK_ENDPOINT_ID is not set in environment variables");
  }

  return { apiKey, endpointId, baseUrl };
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
 * Handles multiple response formats from RunPod handlers
 */
export function extractImagesFromOutput(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
): Array<{ url: string; filename: string }> {
  if (!output) {
    console.log("extractImagesFromOutput: output is null/undefined");
    return [];
  }

  const images: Array<{ url: string; filename: string }> = [];

  // Format 0: RunPod wraps handler output in another "output" field
  // Handler returns: { status: "COMPLETED", output: { images: [...] } }
  // RunPod returns: { id, status, output: { status: "COMPLETED", output: { images: [...] } } }
  // So we need to check output.output.images first
  if (output.output?.images && Array.isArray(output.output.images)) {
    console.log("extractImagesFromOutput: Found nested output.output.images with", output.output.images.length, "items");
    for (const image of output.output.images) {
      if (image.url) {
        images.push({
          url: image.url,
          filename: image.filename || extractFilenameFromUrl(image.url),
        });
      }
    }
    // Return early since we found images in nested structure
    if (images.length > 0) {
      console.log("extractImagesFromOutput: Total images found:", images.length);
      return images;
    }
  }

  // Format 1: output.images array (original expected format)
  if (output.images && Array.isArray(output.images)) {
    console.log("extractImagesFromOutput: Found images array with", output.images.length, "items");
    for (const image of output.images) {
      if (image.url) {
        images.push({
          url: image.url,
          filename: image.filename || extractFilenameFromUrl(image.url),
        });
      }
    }
  }

  // Format 2: output.s3_url (single S3 URL)
  if (output.s3_url && typeof output.s3_url === "string") {
    console.log("extractImagesFromOutput: Found s3_url:", output.s3_url);
    images.push({
      url: output.s3_url,
      filename: extractFilenameFromUrl(output.s3_url),
    });
  }

  // Format 3: output.image_url (single image URL)
  if (output.image_url && typeof output.image_url === "string") {
    console.log("extractImagesFromOutput: Found image_url:", output.image_url);
    images.push({
      url: output.image_url,
      filename: extractFilenameFromUrl(output.image_url),
    });
  }

  // Format 4: output.url (direct URL)
  if (output.url && typeof output.url === "string" && isImageUrl(output.url)) {
    console.log("extractImagesFromOutput: Found url:", output.url);
    images.push({
      url: output.url,
      filename: extractFilenameFromUrl(output.url),
    });
  }

  // Format 5: output.image (single URL string)
  if (output.image && typeof output.image === "string" && isImageUrl(output.image)) {
    console.log("extractImagesFromOutput: Found image:", output.image);
    images.push({
      url: output.image,
      filename: extractFilenameFromUrl(output.image),
    });
  }

  // Format 6: Search for any S3 URL in output values
  if (images.length === 0) {
    console.log("extractImagesFromOutput: Searching for S3 URLs in output...");
    for (const [key, value] of Object.entries(output)) {
      if (typeof value === "string" && isS3Url(value)) {
        console.log(`extractImagesFromOutput: Found S3 URL in field '${key}':`, value);
        images.push({
          url: value,
          filename: extractFilenameFromUrl(value),
        });
      }
    }
  }

  console.log("extractImagesFromOutput: Total images found:", images.length);
  return images;
}

/**
 * Extract filename from a URL
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return pathname.split("/").pop() || "image.png";
  } catch {
    return "image.png";
  }
}

/**
 * Check if a URL looks like an image URL
 */
function isImageUrl(url: string): boolean {
  try {
    const lower = url.toLowerCase();
    return (
      lower.includes(".png") ||
      lower.includes(".jpg") ||
      lower.includes(".jpeg") ||
      lower.includes(".webp") ||
      lower.includes(".gif") ||
      lower.includes("s3.") ||
      lower.includes("amazonaws.com")
    );
  } catch {
    return false;
  }
}

/**
 * Check if a URL is an S3 URL
 */
function isS3Url(url: string): boolean {
  try {
    return url.includes("s3.") && url.includes("amazonaws.com");
  } catch {
    return false;
  }
}

// =============================================================================
// Avatar & Poses - RunPod Serverless (shared endpoint)
// =============================================================================

function getRunPodAvatarConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_AVATAR_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not set in environment variables");
  }
  if (!endpointId) {
    throw new Error("RUNPOD_AVATAR_ENDPOINT_ID is not set in environment variables");
  }

  return { apiKey, endpointId, baseUrl };
}

/**
 * Run an avatar workflow on RunPod serverless (async).
 * Sends the full ComfyUI workflow JSON to the handler.
 * @deprecated Use runAvatarAsync instead - sends flat params for the handler to inject.
 */
export async function runAvatarWorkflowAsync(
  workflow: Record<string, unknown>
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodAvatarConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = {
    input: {
      workflow,
      type: "avatar",
    },
  };

  console.log("=== RunPod Avatar API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);

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
    console.error("RunPod Avatar API Error:", errorText);
    throw new Error(`RunPod Avatar API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Avatar job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Run an avatar generation on RunPod serverless (async).
 * Sends flat parameters directly in input so the handler can inject them
 * into its baked workflow (Node 252 and Node 52).
 */
export async function runAvatarAsync(
  params: Record<string, string | number>
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodAvatarConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = {
    input: params,
  };

  console.log("=== RunPod Avatar API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);
  console.log("Params:", JSON.stringify(params, null, 2));

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
    console.error("RunPod Avatar API Error:", errorText);
    throw new Error(`RunPod Avatar API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Avatar job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Run a poses workflow on RunPod serverless (async).
 * Sends the full ComfyUI workflow JSON plus the S3 key of the input image.
 * The handler downloads the image from S3 using this key.
 */
export async function runPosesWorkflowAsync(
  workflow: Record<string, unknown>,
  s3Key: string
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodAvatarConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = {
    input: {
      workflow,
      type: "poses",
      s3_key: s3Key,
    },
  };

  console.log("=== RunPod Poses API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);

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
    console.error("RunPod Poses API Error:", errorText);
    throw new Error(`RunPod Poses API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Poses job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Check the status of an Avatar/Poses RunPod job.
 */
export async function getAvatarJobStatus(jobId: string): Promise<RunPodStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodAvatarConfig();
  const url = `${baseUrl}/${endpointId}/status/${jobId}`;

  console.log("Checking Avatar/Poses job status:", jobId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Avatar/Poses Status API Error:", errorText);
    throw new Error(`RunPod status error: ${response.status} - ${errorText}`);
  }

  const result: RunPodStatusResponse = await response.json();
  console.log("Avatar/Poses job status:", result.status);

  return result;
}

// =============================================================================
// Vellum Workflows (piel, edad, makeup, pecas) - Dedicated RunPod endpoint
// =============================================================================

function getRunPodVellumWorkflowsConfig() {
  const apiKey = process.env.RUNPOD_API_KEY;
  const endpointId = process.env.RUNPOD_VELLUM_WORKFLOWS_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not set in environment variables");
  }
  if (!endpointId) {
    throw new Error("RUNPOD_VELLUM_WORKFLOWS_ENDPOINT_ID is not set in environment variables");
  }

  return { apiKey, endpointId, baseUrl };
}

/**
 * Check the status of a Vellum Workflows RunPod job
 */
export async function getVellumWorkflowsJobStatus(jobId: string): Promise<RunPodStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/status/${jobId}`;

  console.log("Checking Vellum Workflows job status:", jobId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Workflows Status API Error:", errorText);
    throw new Error(`RunPod status error: ${response.status} - ${errorText}`);
  }

  const result: RunPodStatusResponse = await response.json();
  console.log("Vellum Workflows job status:", result.status);

  return result;
}

// =============================================================================
// Vellum 2.0 (Legacy) - Uses separate RunPod endpoint
// =============================================================================

function getRunPodVellum20Config() {
  const apiKey = process.env.RUNPOD_API_KEY;
  // Falls back to the same endpoint if no separate one is configured
  const endpointId = process.env.RUNPOD_VELLUM20_ENDPOINT_ID || process.env.RUNPOD_ENDPOINT_ID;
  const baseUrl = process.env.BASE_URL_RUNPOD || "https://api.runpod.ai/v2";

  if (!apiKey) {
    throw new Error("RUNPOD_API_KEY is not set in environment variables");
  }
  if (!endpointId) {
    throw new Error("RUNPOD_VELLUM20_ENDPOINT_ID (or RUNPOD_ENDPOINT_ID) is not set in environment variables");
  }

  return { apiKey, endpointId, baseUrl };
}

/**
 * Vellum 2.0 (Legacy) Workflow Inputs
 * Uses SeedVR2 for upscaling instead of the newer pipeline
 */
export interface Vellum20WorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI
  strength_model: number; // 0 to 1 (LoRA strength)
  scale_by: string;       // "2", "4", or "8"
}

export interface VellumPielWorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI
  scale_by: number;       // 1 for 4K, 2 for 8K (node 261 INTConstant)
}

export interface VellumEdadWorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI
  scale_by: number;       // 1 for 4K, 2 for 8K
  age_select: number;     // 1-6 (maps to node 268 ImpactSwitch)
}

export interface VellumMakeupWorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI (model face)
  makeup_ref: string;     // Base64 data URI (makeup reference)
  scale_by: number;       // 1 for 4K, 2 for 8K
}

export interface VellumPecasWorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI
  scale_by: number;       // 1 for 4K, 2 for 8K
  freckle_select: number; // 1-3 (maps to node 268 ImpactSwitch)
}

export interface VellumPeloWorkflowInput {
  workflow: any;
  input_image: string;    // Base64 data URI (model face)
  pelo_ref: string;       // Base64 data URI (hair reference)
  scale_by: number;       // 1 for 4K, 2 for 8K
}

export interface VellumOrbitalWorkflowInput {
  workflow: any;
  input_image: string;      // Base64 data URI
  scale_by: number;         // 1 for 4K, 2 for 8K (node 366)
  horizontal_select: number; // 1-9 (node 308 ImpactSwitch)
  vertical_select: number;   // 1-9 (node 310 ImpactSwitch)
  zoom_select: number;       // 1-3 (node 293 ImpactSwitch)
}

export interface VideoTranslateWorkflowInput {
  workflow: any;
  media_type: "video" | "audio";
  // Key of the file already uploaded to S3 via the multipart upload API.
  // The worker downloads from this key and deletes it after the run.
  s3_key: string;
  // Only meaningful when media_type === "audio". Picked from the filename
  // when the client doesn't send one explicitly.
  audio_extension?: string;
}

/**
 * Build the workflow payload for Vellum Piel
 * Sends image + scale value (1=4K, 2=8K) for node 261
 */
function buildVellumPielWorkflowPayload(input: VellumPielWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      scaleFactor: input.scale_by,
      workflow_type: "piel",
    },
  };
}

/**
 * Run Vellum Piel workflow on RunPod (async)
 */
export async function runVellumPielWorkflowAsync(
  input: VellumPielWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumPielWorkflowPayload(input);

  console.log("=== RunPod Vellum Piel API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);
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
    console.error("RunPod Vellum Piel API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Piel job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Vellum Edad
 * Sends image + scale + age_select (1-6) for node 268 ImpactSwitch
 */
function buildVellumEdadWorkflowPayload(input: VellumEdadWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      scaleFactor: input.scale_by,
      age_select: input.age_select,
      workflow_type: "edad",
    },
  };
}

/**
 * Run Vellum Edad workflow on RunPod (async)
 */
export async function runVellumEdadWorkflowAsync(
  input: VellumEdadWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumEdadWorkflowPayload(input);

  console.log("=== RunPod Vellum Edad API Call (async) ===");
  console.log("URL:", url);
  console.log("Scale Factor:", input.scale_by);
  console.log("Age Select:", input.age_select);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Edad API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Edad job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Vellum Makeup
 * Sends model image + makeup reference image + scale
 */
function buildVellumMakeupWorkflowPayload(input: VellumMakeupWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  let makeupBase64 = input.makeup_ref;
  if (makeupBase64.includes(',')) {
    makeupBase64 = makeupBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      makeup_ref: makeupBase64,
      scaleFactor: input.scale_by,
      workflow_type: "makeup",
    },
  };
}

/**
 * Run Vellum Makeup workflow on RunPod (async)
 */
export async function runVellumMakeupWorkflowAsync(
  input: VellumMakeupWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumMakeupWorkflowPayload(input);

  console.log("=== RunPod Vellum Makeup API Call (async) ===");
  console.log("URL:", url);
  console.log("Scale Factor:", input.scale_by);
  console.log("Has makeup ref:", !!input.makeup_ref);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Makeup API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Makeup job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Vellum Pecas
 * Sends image + scale + freckle_select (1-3) for node 268 ImpactSwitch
 */
function buildVellumPecasWorkflowPayload(input: VellumPecasWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      scaleFactor: input.scale_by,
      freckle_select: input.freckle_select,
      workflow_type: "pecas",
    },
  };
}

/**
 * Run Vellum Pecas workflow on RunPod (async)
 */
export async function runVellumPecasWorkflowAsync(
  input: VellumPecasWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumPecasWorkflowPayload(input);

  console.log("=== RunPod Vellum Pecas API Call (async) ===");
  console.log("URL:", url);
  console.log("Scale Factor:", input.scale_by);
  console.log("Freckle Select:", input.freckle_select);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Pecas API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Pecas job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Vellum Pelo
 * Sends model image + hair reference image + scale
 */
function buildVellumPeloWorkflowPayload(input: VellumPeloWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  let peloBase64 = input.pelo_ref;
  if (peloBase64.includes(',')) {
    peloBase64 = peloBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      pelo_ref: peloBase64,
      scaleFactor: input.scale_by,
      workflow_type: "pelo",
    },
  };
}

/**
 * Run Vellum Pelo workflow on RunPod (async)
 */
export async function runVellumPeloWorkflowAsync(
  input: VellumPeloWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumPeloWorkflowPayload(input);

  console.log("=== RunPod Vellum Pelo API Call (async) ===");
  console.log("URL:", url);
  console.log("Scale Factor:", input.scale_by);
  console.log("Has pelo ref:", !!input.pelo_ref);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Pelo API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Pelo job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Vellum Orbital
 * Sends image + scale + horizontal/vertical/zoom selects
 */
function buildVellumOrbitalWorkflowPayload(input: VellumOrbitalWorkflowInput) {
  let imageBase64 = input.input_image;
  if (imageBase64.includes(',')) {
    imageBase64 = imageBase64.split(',')[1];
  }

  return {
    input: {
      image: imageBase64,
      scaleFactor: input.scale_by,
      horizontal_select: input.horizontal_select,
      vertical_select: input.vertical_select,
      zoom_select: input.zoom_select,
      workflow_type: "orbital",
    },
  };
}

/**
 * Run Vellum Orbital workflow on RunPod (async)
 */
export async function runVellumOrbitalWorkflowAsync(
  input: VellumOrbitalWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellumOrbitalWorkflowPayload(input);

  console.log("=== RunPod Vellum Orbital API Call (async) ===");
  console.log("URL:", url);
  console.log("Scale Factor:", input.scale_by);
  console.log("Horizontal Select:", input.horizontal_select);
  console.log("Vertical Select:", input.vertical_select);
  console.log("Zoom Select:", input.zoom_select);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum Orbital API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum Orbital job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Build the workflow payload for Video Translate.
 *
 * The browser uploaded the source file directly to S3 via multipart upload;
 * we only forward the s3_key. The handler downloads the object, saves it to
 * ComfyUI's input dir, and injects the filename into node 82 (VHS_LoadVideo)
 * or node 89 (LoadAudio), toggling node 88 (ComfySwitchNode) accordingly.
 */
function buildVideoTranslateWorkflowPayload(input: VideoTranslateWorkflowInput) {
  if (!input.s3_key) {
    throw new Error("s3_key is required");
  }

  if (input.media_type === "audio") {
    return {
      input: {
        s3_key: input.s3_key,
        audio_extension: input.audio_extension || "mp3",
        media_type: "audio",
        workflow_type: "video-translate",
      },
    };
  }

  return {
    input: {
      s3_key: input.s3_key,
      media_type: "video",
      workflow_type: "video-translate",
    },
  };
}

/**
 * Run Video Translate workflow on RunPod (async)
 */
export async function runVideoTranslateWorkflowAsync(
  input: VideoTranslateWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellumWorkflowsConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVideoTranslateWorkflowPayload(input);

  console.log("=== RunPod Video Translate API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Video Translate API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Video Translate job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Extract the audio result from a Video Translate RunPod output.
 * The handler uploads a single audio file (flac/wav/mp3) to S3 and returns a presigned URL.
 */
export function extractAudioFromOutput(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
): Array<{ url: string; filename: string }> {
  if (!output) return [];

  const audios: Array<{ url: string; filename: string }> = [];
  const isAudioish = (value: string) => {
    const lower = value.toLowerCase();
    return (
      lower.includes(".flac") ||
      lower.includes(".wav") ||
      lower.includes(".mp3") ||
      lower.includes(".ogg") ||
      lower.includes(".m4a")
    );
  };

  // Format 0: nested output (RunPod sometimes wraps handler output)
  const nested = output.output ?? output;

  // Format 1: { audios: [...] }
  if (Array.isArray(nested.audios)) {
    for (const a of nested.audios) {
      if (a?.url) {
        audios.push({ url: a.url, filename: a.filename || extractFilenameFromUrl(a.url) });
      }
    }
  }

  // Format 2: { audio_url: "..." }
  if (typeof nested.audio_url === "string") {
    audios.push({
      url: nested.audio_url,
      filename: nested.filename || extractFilenameFromUrl(nested.audio_url),
    });
  }

  // Format 3: { url: "..." } if it looks like an audio URL
  if (typeof nested.url === "string" && isAudioish(nested.url)) {
    audios.push({ url: nested.url, filename: extractFilenameFromUrl(nested.url) });
  }

  // Format 4: generic scan for audio-looking S3 URLs in any string field
  if (audios.length === 0) {
    const scan = (obj: Record<string, unknown>) => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === "string" && isAudioish(value)) {
          audios.push({ url: value, filename: extractFilenameFromUrl(value) });
        }
      }
    };
    if (output && typeof output === "object") scan(output as Record<string, unknown>);
    if (nested && typeof nested === "object" && nested !== output) {
      scan(nested as Record<string, unknown>);
    }
  }

  return audios;
}

/**
 * Build the workflow payload for Vellum 2.0 (legacy)
 */
function buildVellum20WorkflowPayload(input: Vellum20WorkflowInput) {
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
 * Run Vellum 2.0 workflow on RunPod (async)
 */
export async function runVellum20WorkflowAsync(
  input: Vellum20WorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellum20Config();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload = buildVellum20WorkflowPayload(input);

  console.log("=== RunPod Vellum 2.0 API Call (async) ===");
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
    console.error("RunPod Vellum 2.0 API Error:", errorText);
    throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("Vellum 2.0 job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Check the status of a Vellum 2.0 RunPod job
 */
export async function getVellum20JobStatus(jobId: string): Promise<RunPodStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodVellum20Config();
  const url = `${baseUrl}/${endpointId}/status/${jobId}`;

  console.log("Checking Vellum 2.0 job status:", jobId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod Vellum 2.0 Status API Error:", errorText);
    throw new Error(`RunPod status error: ${response.status} - ${errorText}`);
  }

  const result: RunPodStatusResponse = await response.json();
  console.log("Vellum 2.0 job status:", result.status);

  return result;
}

// =============================================================================
// AI Talk - RunPod Serverless (InfiniteTalk/WanVideo workflow)
// =============================================================================

/**
 * AI Talk workflow inputs sent to the RunPod handler (Seedance 1.5 workflow).
 * Audio must last at least 90 s; the handler slices it into 9 consecutive 10 s
 * segments (nodes 110/115/187/188/295/296/297/298/305).
 */
export interface AiTalkWorkflowInput {
  input_image: string;          // Base64 data URI of the character image (node 19)
  input_audio: string;          // Base64 data URI of the audio (node 21)
  prompt_prefix?: string;       // Prefix applied to BOTH node 100 text and node 309 string_a
  resolution?: string;          // Seedance resolution (nodes 318-327), e.g. "480p" | "720p" | "1080p"
  voice_id?: string;            // ElevenLabs voice id for the Voice Changer node (359)
}

/**
 * RunPod AI Talk status response.
 * The handler returns a video_url after uploading to S3.
 */
export interface AiTalkStatusResponse {
  id: string;
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: {
    video_url?: string;
    filename?: string;
    execution_time_s?: number;
    file_size_mb?: number;
  };
  error?: string;
}

/**
 * Submit an AI Talk job to RunPod (async).
 * Returns a job ID for status polling.
 */
export async function runAiTalkWorkflowAsync(
  input: AiTalkWorkflowInput
): Promise<{ jobId: string }> {
  const { apiKey, endpointId, baseUrl } = getRunPodAiTalkConfig();
  const url = `${baseUrl}/${endpointId}/run`;

  const payload: { input: Record<string, string> } = {
    input: {
      input_image: input.input_image,
      input_audio: input.input_audio,
    },
  };
  if (input.prompt_prefix) payload.input.prompt_prefix = input.prompt_prefix;
  if (input.resolution) payload.input.resolution = input.resolution;
  if (input.voice_id) payload.input.voice_id = input.voice_id;

  console.log("=== RunPod AI Talk API Call (async) ===");
  console.log("URL:", url);
  console.log("Endpoint ID:", endpointId);
  console.log("Resolution:", input.resolution || "default");
  console.log("Voice id:", input.voice_id || "default");
  console.log("Has image:", !!input.input_image);
  console.log("Has audio:", !!input.input_audio);

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
    console.error("RunPod AI Talk API Error:", errorText);
    if (response.status === 404) {
      console.error(
        `RunPod endpoint '${endpointId}' not found. ` +
        "Please verify the endpoint exists and is active in your RunPod dashboard, " +
        "and that RUNPOD_AITALK_ENDPOINT_ID is set correctly."
      );
      throw new Error(
        "RunPod AI Talk endpoint not found. The serverless endpoint may have been " +
        "deleted or deactivated. Please check your RunPod dashboard and update " +
        "RUNPOD_AITALK_ENDPOINT_ID if needed."
      );
    }
    if (response.status === 401) {
      throw new Error(
        "RunPod API authentication failed. Please verify RUNPOD_API_KEY is correct."
      );
    }
    throw new Error(`RunPod AI Talk API error: ${response.status} - ${errorText}`);
  }

  const result: RunPodJobResponse = await response.json();
  console.log("AI Talk job started with ID:", result.id);

  return { jobId: result.id };
}

/**
 * Check the status of an AI Talk RunPod job.
 */
export async function getAiTalkJobStatus(
  jobId: string
): Promise<AiTalkStatusResponse> {
  const { apiKey, endpointId, baseUrl } = getRunPodAiTalkConfig();
  const url = `${baseUrl}/${endpointId}/status/${jobId}`;

  console.log("Checking AI Talk job status:", jobId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("RunPod AI Talk Status API Error:", errorText);
    throw new Error(
      `RunPod AI Talk status error: ${response.status} - ${errorText}`
    );
  }

  const result: AiTalkStatusResponse = await response.json();
  console.log("AI Talk job status:", result.status);

  return result;
}

/**
 * Extract video URL from AI Talk RunPod output.
 * The handler uploads the video to S3 and returns a presigned URL.
 */
export function extractVideoFromAiTalkOutput(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  output: any
): Array<{ url: string; filename: string }> {
  if (!output) {
    console.log("extractVideoFromAiTalkOutput: output is null/undefined");
    return [];
  }

  const videos: Array<{ url: string; filename: string }> = [];

  // Format 1: Direct video_url from handler
  if (output.video_url && typeof output.video_url === "string") {
    console.log("extractVideoFromAiTalkOutput: Found video_url");
    videos.push({
      url: output.video_url,
      filename: output.filename || "ai-talk-video.mp4",
    });
  }

  // Format 2: Nested output (RunPod sometimes wraps)
  if (output.output?.video_url && typeof output.output.video_url === "string") {
    console.log("extractVideoFromAiTalkOutput: Found nested video_url");
    videos.push({
      url: output.output.video_url,
      filename: output.output.filename || "ai-talk-video.mp4",
    });
  }

  // Format 3: Fallback to generic S3 URL search
  if (videos.length === 0) {
    for (const [key, value] of Object.entries(output)) {
      if (
        typeof value === "string" &&
        (value.includes("amazonaws.com") || value.includes(".mp4"))
      ) {
        console.log(`extractVideoFromAiTalkOutput: Found URL in field '${key}'`);
        videos.push({
          url: value,
          filename: extractFilenameFromUrl(value),
        });
      }
    }
  }

  console.log("extractVideoFromAiTalkOutput: Total videos found:", videos.length);
  return videos;
}
