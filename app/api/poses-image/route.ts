import { NextRequest, NextResponse } from "next/server";
import { fetchComfyUIImage } from "@/lib/comfyui-local";

export async function GET(request: NextRequest) {
  const filename = request.nextUrl.searchParams.get("filename");
  const subfolder = request.nextUrl.searchParams.get("subfolder") || "";
  const type = request.nextUrl.searchParams.get("type") || "output";

  if (!filename) {
    return NextResponse.json(
      { error: "Missing filename parameter" },
      { status: 400 }
    );
  }

  try {
    const { data, contentType } = await fetchComfyUIImage(filename, subfolder, type);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Poses image proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch image" },
      { status: 500 }
    );
  }
}
