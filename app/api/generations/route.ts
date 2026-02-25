import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { uploadImageFromUrl } from "@/lib/s3";
import { cookies } from "next/headers";

// GET /api/generations - Retrieve user's generation history
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const result = await query(
      `SELECT g.id, g.run_id, g.workflow_name, g.parameters, g.created_at,
              COALESCE(
                json_agg(
                  json_build_object('url', gi.url, 'filename', gi.filename)
                  ORDER BY gi.id
                ) FILTER (WHERE gi.id IS NOT NULL),
                '[]'
              ) as images
       FROM generations g
       LEFT JOIN generation_images gi ON gi.generation_id = g.id
       WHERE g.user_id = $1
       GROUP BY g.id
       ORDER BY g.created_at DESC
       LIMIT 100`,
      [payload.userId]
    );

    const history = result.rows.map((row) => ({
      runId: row.run_id,
      timestamp: new Date(row.created_at).getTime(),
      images: row.images,
      workflowName: row.workflow_name,
      parameters: row.parameters,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching generations:", error);
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}

// POST /api/generations - Save a generation with parameters and images
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { runId, workflowName, parameters, images } = body;

    if (!runId || !images || images.length === 0) {
      return NextResponse.json(
        { error: "runId and images are required" },
        { status: 400 }
      );
    }

    // Insert the generation record
    const genResult = await query(
      `INSERT INTO generations (user_id, run_id, workflow_name, parameters)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [payload.userId, runId, workflowName || null, parameters ? JSON.stringify(parameters) : "{}"]
    );

    const generationId = genResult.rows[0].id;

    // Upload images to S3 and save the S3 URL in the DB
    const savedImages: Array<{ url: string; filename: string }> = [];

    for (const image of images) {
      // Build full URL for proxy images (e.g. /api/avatar-image?...)
      const imageUrl = image.url.startsWith("http")
        ? image.url
        : `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}${image.url}`;

      let finalUrl: string;
      try {
        finalUrl = await uploadImageFromUrl(imageUrl, image.filename);
      } catch (uploadError) {
        console.error("S3 upload failed for image:", uploadError);
        finalUrl = image.url; // fallback to original URL
      }

      await query(
        `INSERT INTO generation_images (generation_id, url, filename)
         VALUES ($1, $2, $3)`,
        [generationId, finalUrl, image.filename]
      );

      savedImages.push({ url: finalUrl, filename: image.filename });
    }

    return NextResponse.json({
      success: true,
      generationId,
      images: savedImages,
    });
  } catch (error) {
    console.error("Error saving generation:", error);
    return NextResponse.json(
      { error: "Failed to save generation" },
      { status: 500 }
    );
  }
}

// DELETE /api/generations - Clear user's generation history
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // CASCADE will delete generation_images too
    await query("DELETE FROM generations WHERE user_id = $1", [payload.userId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing generations:", error);
    return NextResponse.json(
      { error: "Failed to clear generations" },
      { status: 500 }
    );
  }
}
