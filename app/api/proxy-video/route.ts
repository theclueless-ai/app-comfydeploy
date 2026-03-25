import { NextRequest } from "next/server";

/**
 * Server-side proxy for S3 video URLs.
 * Forwards the request to S3 and streams the response back to the browser,
 * avoiding CORS issues that occur when the browser loads S3 URLs directly.
 * Supports Range requests so the browser can seek within the video.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get("url");

  if (!videoUrl) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // Only allow proxying from AWS S3
  if (!videoUrl.includes("amazonaws.com")) {
    return new Response("Invalid URL: only S3 URLs are allowed", { status: 403 });
  }

  // Forward Range header so the browser can seek through the video
  const fetchHeaders: HeadersInit = {};
  const range = request.headers.get("range");
  if (range) {
    fetchHeaders["Range"] = range;
  }

  let s3Response: Response;
  try {
    s3Response = await fetch(videoUrl, { headers: fetchHeaders });
  } catch (err) {
    console.error("[proxy-video] Failed to fetch from S3:", err);
    return new Response("Failed to fetch video from storage", { status: 502 });
  }

  if (!s3Response.ok && s3Response.status !== 206) {
    console.error("[proxy-video] S3 returned error:", s3Response.status);
    return new Response("Video not found or expired", { status: s3Response.status });
  }

  const responseHeaders = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  });

  const contentLength = s3Response.headers.get("Content-Length");
  if (contentLength) responseHeaders.set("Content-Length", contentLength);

  const contentRange = s3Response.headers.get("Content-Range");
  if (contentRange) responseHeaders.set("Content-Range", contentRange);

  return new Response(s3Response.body, {
    status: s3Response.status,
    headers: responseHeaders,
  });
}
