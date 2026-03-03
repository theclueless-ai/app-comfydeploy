import { NextRequest, NextResponse } from "next/server";
import { fetchComfyUIVideo } from "@/lib/comfyui-local";

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
    const { data, contentType } = await fetchComfyUIVideo(filename, subfolder, type);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("AI Talk video proxy error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch video" },
      { status: 500 }
    );
  }
}
