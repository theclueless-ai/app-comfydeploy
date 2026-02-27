/**
 * Local ComfyUI API client
 * Communicates directly with a ComfyUI instance on the local network
 */

const COMFYUI_URL = process.env.COMFYUI_LOCAL_URL || "http://127.0.0.1:8188";

export async function queuePrompt(workflow: Record<string, unknown>): Promise<string> {
  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI prompt failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.prompt_id;
}

export interface ComfyUIHistoryEntry {
  status: {
    completed?: boolean;
    status_str?: string;
  };
  outputs: Record<string, {
    images?: Array<{
      filename: string;
      subfolder: string;
      type: string;
    }>;
    errors?: unknown;
  }>;
}

export async function getHistory(promptId: string): Promise<ComfyUIHistoryEntry | null> {
  const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);

  if (!response.ok) {
    return null;
  }

  const history = await response.json();

  if (promptId in history) {
    return history[promptId] as ComfyUIHistoryEntry;
  }

  return null;
}

export function getComfyUIViewUrl(
  filename: string,
  subfolder: string = "",
  type: string = "output"
): string {
  const params = new URLSearchParams({ filename, subfolder, type });
  return `${COMFYUI_URL}/view?${params.toString()}`;
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([file], { type: contentType });
  formData.append("image", blob, filename);
  formData.append("overwrite", "true");

  const response = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI image upload failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.name;
}

export async function fetchComfyUIImage(
  filename: string,
  subfolder: string = "",
  type: string = "output"
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const url = getComfyUIViewUrl(filename, subfolder, type);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image from ComfyUI: ${response.status}`);
  }

  const data = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") || "image/png";
  return { data, contentType };
}
