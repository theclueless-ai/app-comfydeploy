import { NextRequest, NextResponse } from "next/server";
import { runAvatarWorkflowAsync } from "@/lib/runpod";
import avatarWorkflowTemplate from "@/lib/avatar-workflow.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Deep-clone the workflow template so we can inject params
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workflow = JSON.parse(JSON.stringify(avatarWorkflowTemplate)) as any;

    // Seed: if 0 generate a random seed so ComfyUI doesn't cache the result
    const seedInput = parseInt(formData.get("seed") as string) || 0;
    const seed = seedInput === 0
      ? Math.floor(Math.random() * 4294967295) + 1
      : seedInput;

    // ── Node 252: CharacterPortraitGenerator ──────────────────────────
    const node252 = workflow["252"].inputs;

    // Global settings
    node252.character_type = (formData.get("character_type") as string) || "HUMAN";
    node252.render_style = (formData.get("render_style") as string) || "RANDOM";
    node252.lighting = (formData.get("lighting") as string) || "RANDOM";
    node252.background = (formData.get("background") as string) || "white studio background";
    node252.seed = seed;

    // Human features (A_ prefix)
    const humanFields = [
      "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_body_type", "A_skin_tone", "A_face_shape",
      "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
      "A_eyebrows", "A_eyelashes",
      "A_nose", "A_lips", "A_ears", "A_freckles", "A_expression", "A_distinctive_features",
    ];
    for (const field of humanFields) {
      const value = formData.get(field) as string;
      if (value) {
        node252[field] = value;
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
        node252[field] = value;
      }
    }

    // Extra custom details
    const extraDetails = formData.get("extra_details") as string;
    if (extraDetails) {
      node252.extra_details = extraDetails;
    }

    // ── Node 52: Color Grading ────────────────────────────────────────
    const node52 = workflow["52"].inputs;
    const colorFields = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"];
    for (const field of colorFields) {
      const value = formData.get(field);
      if (value !== null && value !== "") {
        node52[field] = parseFloat(value as string);
      }
    }

    // ── Node 3: KSampler seed ─────────────────────────────────────────
    workflow["3"].inputs.seed = seed;

    // Send full workflow JSON to RunPod so the handler uses THIS workflow
    // instead of its baked (outdated) copy.
    const { jobId } = await runAvatarWorkflowAsync(workflow);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("Avatar workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run avatar workflow" },
      { status: 500 }
    );
  }
}
