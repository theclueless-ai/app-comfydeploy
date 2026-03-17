import { NextRequest, NextResponse } from "next/server";
import { runAvatarAsync } from "@/lib/runpod";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Build flat parameter object matching what the RunPod handler expects.
    // The handler loads its own baked workflow and injects these params into
    // Node 252 (CharacterPortraitGenerator) and Node 52 (Color Grading).
    const params: Record<string, string | number> = {
      type: "avatar",
    };

    // Global settings
    params.character_type = (formData.get("character_type") as string) || "HUMAN";
    params.render_style = (formData.get("render_style") as string) || "RANDOM";
    params.lighting = (formData.get("lighting") as string) || "RANDOM";
    params.background = (formData.get("background") as string) || "white studio background";

    // Seed: if 0 generate a random seed so ComfyUI doesn't cache the result
    const seedInput = parseInt(formData.get("seed") as string) || 0;
    params.seed = seedInput === 0
      ? Math.floor(Math.random() * 4294967295) + 1
      : seedInput;

    // Human features (A_ prefix)
    const humanFields = [
      "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_skin_tone", "A_face_shape",
      "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
      "A_eyebrows", "A_eyelashes",
      "A_nose", "A_lips", "A_ears", "A_freckles", "A_expression", "A_distinctive_features",
    ];
    for (const field of humanFields) {
      const value = formData.get(field) as string;
      if (value) {
        params[field] = value;
      }
    }

    // Non-human features (B_ prefix)
    const nonhumanFields = [
      "B_hair_color", "B_hair_style",
      "B_skin_texture", "B_skin_color", "B_eyes", "B_face_structure", "B_organic_additions",
    ];
    for (const field of nonhumanFields) {
      const value = formData.get(field) as string;
      if (value) {
        params[field] = value;
      }
    }

    // Color grading
    const colorFields = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"];
    for (const field of colorFields) {
      const value = formData.get(field);
      if (value !== null && value !== "") {
        params[field] = parseFloat(value as string);
      }
    }

    // Send flat params to RunPod serverless
    const { jobId } = await runAvatarAsync(params);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Avatar workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run avatar workflow" },
      { status: 500 }
    );
  }
}
