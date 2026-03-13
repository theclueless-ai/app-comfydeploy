import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = [
  "comfy-deploy-output.s3.us-east-2.amazonaws.com",
  "comfydeploy.com",
  "www.comfydeploy.com",
];

const MAX_RETRIES = 4;
const RETRY_DELAYS = [2000, 3000, 4000, 5000]; // ms

async function fetchWithRetry(url: string): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { cache: "no-store" });

    if (res.ok) return res;

    // If S3 returns 404/403, the image may still be uploading — retry
    if ((res.status === 404 || res.status === 403) && attempt < MAX_RETRIES) {
      console.log(`Proxy: image not ready (${res.status}), retry ${attempt + 1}/${MAX_RETRIES} in ${RETRY_DELAYS[attempt]}ms — ${url}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      continue;
    }

    throw new Error(`Upstream returned ${res.status}`);
  }

  throw new Error("Max retries exceeded");
}

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

    const res = await fetchWithRetry(url);
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/png";

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Proxy image error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
