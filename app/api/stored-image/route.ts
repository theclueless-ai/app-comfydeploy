import { NextRequest, NextResponse } from "next/server";
import { getStoredImage } from "@/lib/local-storage";

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");

  if (!file) {
    return NextResponse.json(
      { error: "Missing file parameter" },
      { status: 400 }
    );
  }

  const result = await getStoredImage(file);

  if (!result) {
    return NextResponse.json(
      { error: "Image not found" },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400",
      "Content-Disposition": `inline; filename="${file}"`,
    },
  });
}
