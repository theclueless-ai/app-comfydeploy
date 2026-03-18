import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "comfy-deploy-output.s3.us-east-2.amazonaws.com",
  "comfy-deploy-output.s3.amazonaws.com",
];

/**
 * Proxy images from ComfyDeploy's S3 bucket.
 * The browser cannot access S3 directly (bucket is private/restricted),
 * but server-side fetch works fine.
 *
 * Usage: /api/image-proxy?url=https://comfy-deploy-output.s3...
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Validate the URL is from an allowed S3 host
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: "URL host not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      console.error(`[image-proxy] S3 returned ${res.status} for ${url}`);
      return NextResponse.json(
        { error: `S3 returned ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const body = res.body;

    if (!body) {
      return NextResponse.json({ error: "Empty response from S3" }, { status: 502 });
    }

    // Stream the response back to the client
    return new NextResponse(body as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[image-proxy] Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
