import { NextRequest, NextResponse } from "next/server";
import { getImageFromS3 } from "@/lib/s3";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key parameter" }, { status: 400 });
  }

  try {
    const { data, contentType } = await getImageFromS3(key);

    return new NextResponse(Buffer.from(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("S3 image fetch error:", error);
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
