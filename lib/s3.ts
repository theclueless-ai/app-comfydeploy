import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "";

export const VIDEO_TRANSLATE_UPLOAD_PREFIX = "video-translate-uploads";

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
 * Upload a poses input image to S3 and return the raw S3 key.
 * The RunPod poses handler downloads this image by key from the same bucket.
 */
export async function uploadPosesInputToS3(
  imageBuffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<string> {
  const key = `poses-input/${Date.now()}-${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: contentType,
    })
  );

  return key;
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

// ---------------------------------------------------------------------------
// Multipart upload helpers (used by /api/video-translate-upload)
//
// The browser uploads parts directly to S3 via presigned URLs, so even 10 GB
// videos never touch the Next.js server. The worker downloads the object by
// key from the same bucket and deletes it when the job finishes.
// ---------------------------------------------------------------------------

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]+/g;

function buildVideoTranslateUploadKey(filename: string): string {
  const safe = filename.replace(SAFE_NAME_RE, "_").slice(0, 120) || "upload.bin";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${VIDEO_TRANSLATE_UPLOAD_PREFIX}/${Date.now()}-${id}-${safe}`;
}

export function isVideoTranslateUploadKey(key: string): boolean {
  return key.startsWith(`${VIDEO_TRANSLATE_UPLOAD_PREFIX}/`);
}

export async function initiateVideoTranslateUpload(
  filename: string,
  contentType: string
): Promise<{ key: string; uploadId: string }> {
  const key = buildVideoTranslateUploadKey(filename);

  const response = await s3Client.send(
    new CreateMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    })
  );

  if (!response.UploadId) {
    throw new Error("S3 did not return an UploadId");
  }

  return { key, uploadId: response.UploadId };
}

export async function presignVideoTranslateUploadPart(
  key: string,
  uploadId: string,
  partNumber: number
): Promise<string> {
  const command = new UploadPartCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  // 1 hour is plenty for a single part, even on slow networks.
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function completeVideoTranslateUpload(
  key: string,
  uploadId: string,
  parts: Array<{ ETag: string; PartNumber: number }>
): Promise<void> {
  const sortedParts: CompletedPart[] = [...parts]
    .sort((a, b) => a.PartNumber - b.PartNumber)
    .map((p) => ({ ETag: p.ETag, PartNumber: p.PartNumber }));

  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: sortedParts },
    })
  );
}

export async function abortVideoTranslateUpload(
  key: string,
  uploadId: string
): Promise<void> {
  await s3Client.send(
    new AbortMultipartUploadCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
    })
  );
}
