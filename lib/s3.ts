import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

/**
 * Upload image to S3 and return the S3 key (not a public URL).
 * Images are served via /api/s3-image?key=... instead of direct S3 URLs.
 */
export async function uploadImageToS3(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<string> {
  const key = `generations/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    })
  );

  // Return a local API URL that serves the image from S3
  return `/api/s3-image?key=${encodeURIComponent(key)}`;
}

/**
 * Upload image to S3 for RunPod processing.
 * Returns the raw S3 key so the RunPod handler can download using its own credentials.
 */
export async function uploadImageForRunPod(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<{ s3Key: string; bucket: string; region: string }> {
  const key = `runpod-input/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    })
  );

  return {
    s3Key: key,
    bucket: BUCKET_NAME,
    region: process.env.AWS_REGION || "us-east-1",
  };
}

/**
 * Get an image from S3 by key.
 */
export async function getImageFromS3(
  key: string
): Promise<{ data: Uint8Array; contentType: string }> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
  );

  const data = await response.Body!.transformToByteArray();
  const contentType = response.ContentType || "image/png";

  return { data, contentType };
}
