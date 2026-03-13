import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "comfy-deploy-output.s3.us-east-2.amazonaws.com",
  "comfydeploy.com",
  "www.comfydeploy.com",
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);

    if (!ALLOWED_HOSTS.some((h) => parsed.hostname.endsWith(h))) {
      return NextResponse.json({ error: "Host not allowed" }, { status: 403 });
    }

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: res.status }
      );
    }

    const contentType = res.headers.get("content-type") || "image/png";
    const contentLength = res.headers.get("content-length");

    // Stream the response body directly — avoids Vercel's 4.5MB buffered limit
    // Streaming limit is 20MB (Hobby) / 60MB (Pro)
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    };
    if (contentLength) {
      headers["Content-Length"] = contentLength;
    }

    return new Response(res.body, { headers });
  } catch (error) {
    console.error("Proxy image error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
