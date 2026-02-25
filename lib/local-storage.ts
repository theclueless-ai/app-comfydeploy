import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), "data", "generations");

async function ensureDir() {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

export async function saveImageLocally(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  await ensureDir();

  // Generate unique filename to avoid collisions
  const uniqueName = `${Date.now()}-${filename}`;
  const filePath = path.join(STORAGE_DIR, uniqueName);
  await fs.writeFile(filePath, imageBuffer);

  // Return the URL path to serve via API
  return `/api/stored-image?file=${encodeURIComponent(uniqueName)}`;
}

export async function getStoredImage(
  filename: string
): Promise<{ data: Buffer; contentType: string } | null> {
  // Sanitize filename to prevent path traversal
  const safeName = path.basename(filename);
  const filePath = path.join(STORAGE_DIR, safeName);

  try {
    const data = await fs.readFile(filePath);

    // Detect content type from file extension
    const ext = path.extname(safeName).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
    };
    const contentType = contentTypes[ext] || "image/png";

    return { data, contentType };
  } catch {
    return null;
  }
}

export async function saveImageFromUrl(
  imageUrl: string,
  filename: string
): Promise<string> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return saveImageLocally(buffer, filename);
}
