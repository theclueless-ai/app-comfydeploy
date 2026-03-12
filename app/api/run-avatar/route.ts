import { NextRequest, NextResponse } from "next/server";
import { runAvatarWorkflowAsync, AvatarWorkflowParams } from "@/lib/runpod";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Build parameters object from form data
    const params: AvatarWorkflowParams = {
      character_type: (formData.get("character_type") as string) || "HUMAN",
      seed: parseInt(formData.get("seed") as string) || 0,
      render_style: (formData.get("render_style") as string) || "RANDOM",
      lighting: (formData.get("lighting") as string) || "RANDOM",
      background: (formData.get("background") as string) || "white studio background",
    };

    // Human features (A_ prefix)
    const humanFields = [
      "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_skin_tone", "A_face_shape",
      "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
      "A_nose", "A_lips", "A_freckles", "A_expression", "A_distinctive_features",
    ];
    for (const field of humanFields) {
      const value = formData.get(field) as string;
      if (value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[field] = value;
      }
    }

    // Non-human features (B_ prefix)
    const nonhumanFields = [
      "B_skin_texture", "B_skin_color", "B_eyes", "B_face_structure", "B_organic_additions",
    ];
    for (const field of nonhumanFields) {
      const value = formData.get(field) as string;
      if (value) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[field] = value;
      }
    }

    // Color grading
    const colorFields = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"];
    for (const field of colorFields) {
      const value = formData.get(field);
      if (value !== null && value !== "") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (params as any)[field] = parseFloat(value as string);
      }
    }

    // Send parameters to RunPod (handler has baked workflow)
    const { jobId } = await runAvatarWorkflowAsync(params);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Avatar workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run avatar workflow" },
      { status: 500 }
    );
  }
}
