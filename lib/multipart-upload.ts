/**
 * Client-side helper for video-translate multipart S3 uploads.
 *
 * The flow:
 *   1. POST /api/video-translate-upload  { action: "initiate" }
 *      -> { key, uploadId }
 *   2. For each part: POST /api/video-translate-upload { action: "sign-part" }
 *      -> { url }   then PUT the chunk to that URL.
 *   3. POST /api/video-translate-upload  { action: "complete" }
 *      -> { key }
 *
 * On any failure we POST { action: "abort" } so S3 doesn't keep the partial
 * upload around.
 */

const UPLOAD_API = "/api/video-translate-upload";

// 50 MB per part. S3 minimum is 5 MB (except for the last part); 50 MB hits a
// good balance between part count (200 parts at 10 GB) and per-request size.
const PART_SIZE = 50 * 1024 * 1024;

// Number of parts uploaded in parallel.
const CONCURRENCY = 4;

export interface MultipartUploadResult {
  key: string;
}

export interface MultipartUploadOptions {
  file: File;
  onProgress?: (progress: { uploadedBytes: number; totalBytes: number }) => void;
  signal?: AbortSignal;
}

interface InitiateResponse {
  key: string;
  uploadId: string;
}

interface SignPartResponse {
  url: string;
}

async function postJson<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(UPLOAD_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    let message = `Upload API error (${response.status})`;
    try {
      const data = await response.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function uploadPartWithProgress(
  url: string,
  body: Blob,
  onChunkProgress: (delta: number) => void,
  signal?: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastLoaded = 0;

    xhr.open("PUT", url);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const delta = event.loaded - lastLoaded;
      lastLoaded = event.loaded;
      if (delta > 0) onChunkProgress(delta);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (!etag) {
          reject(new Error("Missing ETag header from S3 response"));
          return;
        }
        // Account for any bytes we didn't already report
        const remaining = body.size - lastLoaded;
        if (remaining > 0) onChunkProgress(remaining);
        resolve(etag);
      } else {
        reject(new Error(`S3 part upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 part upload"));
    xhr.onabort = () => reject(new DOMException("Aborted", "AbortError"));

    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }

    xhr.send(body);
  });
}

export async function uploadVideoTranslateFile(
  options: MultipartUploadOptions
): Promise<MultipartUploadResult> {
  const { file, onProgress, signal } = options;

  if (!file.size) throw new Error("File is empty");

  const totalParts = Math.max(1, Math.ceil(file.size / PART_SIZE));
  if (totalParts > 10_000) {
    throw new Error("File too large: would exceed S3's 10000-part limit");
  }

  const { key, uploadId } = await postJson<InitiateResponse>(
    {
      action: "initiate",
      filename: file.name,
      contentType: file.type || "application/octet-stream",
    },
    signal
  );

  const completedParts: Array<{ ETag: string; PartNumber: number }> = new Array(
    totalParts
  );
  let uploadedBytes = 0;

  const reportProgress = (delta: number) => {
    uploadedBytes += delta;
    onProgress?.({ uploadedBytes, totalBytes: file.size });
  };

  let nextPart = 1;
  const claimNext = (): number | null => {
    if (nextPart > totalParts) return null;
    return nextPart++;
  };

  const worker = async () => {
    while (true) {
      const partNumber = claimNext();
      if (partNumber === null) return;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const blob = file.slice(start, end);

      const { url } = await postJson<SignPartResponse>(
        { action: "sign-part", key, uploadId, partNumber },
        signal
      );

      const etag = await uploadPartWithProgress(url, blob, reportProgress, signal);
      completedParts[partNumber - 1] = { ETag: etag, PartNumber: partNumber };
    }
  };

  try {
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, totalParts) },
      () => worker()
    );
    await Promise.all(workers);

    await postJson<{ key: string }>(
      { action: "complete", key, uploadId, parts: completedParts },
      signal
    );

    return { key };
  } catch (error) {
    // Best-effort abort; ignore network errors here.
    fetch(UPLOAD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "abort", key, uploadId }),
      keepalive: true,
    }).catch(() => undefined);
    throw error;
  }
}
