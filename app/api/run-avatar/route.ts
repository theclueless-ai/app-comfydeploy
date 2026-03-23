import { NextRequest, NextResponse } from "next/server";
import { queuePrompt } from "@/lib/comfyui-local";
import avatarWorkflowTemplate from "@/lib/avatar-workflow.json";

const COLOR_FIELDS = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Build flat parameter object (same fields as before)
    const params: Record<string, string | number> = {};

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
      "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_body_type", "A_skin_tone", "A_face_shape",
      "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
      "A_eyebrows", "A_eyelashes",
      "A_nose", "A_lips", "A_ears", "A_freckles", "A_expression", "A_distinctive_features",
    ];
    for (const field of humanFields) {
      const value = formData.get(field) as string;
      if (value) params[field] = value;
    }

    // Non-human features (B_ prefix)
    const nonhumanFields = [
      "B_hair_color", "B_hair_style",
      "B_skin_texture", "B_skin_color", "B_eyes", "B_face_structure", "B_organic_additions",
    ];
    for (const field of nonhumanFields) {
      const value = formData.get(field) as string;
      if (value) params[field] = value;
    }

    // Extra custom details
    const extraDetails = formData.get("extra_details") as string;
    if (extraDetails) params.extra_details = extraDetails;

    // Color grading
    for (const field of COLOR_FIELDS) {
      const value = formData.get(field);
      if (value !== null && value !== "") {
        params[field] = parseFloat(value as string);
      }
    }

    // Clone workflow template and inject params
    type WorkflowNode = { inputs: Record<string, unknown> };
    const workflow = JSON.parse(JSON.stringify(avatarWorkflowTemplate)) as Record<string, WorkflowNode>;

    // Node 252: CharacterPortraitGenerator — receives all non-color params
    const node252 = workflow["252"];
    if (node252) {
      for (const [key, value] of Object.entries(params)) {
        if (!COLOR_FIELDS.includes(key)) {
          node252.inputs[key] = value;
        }
      }
    }

    // Node 52: ColorCorrect — receives color grading params
    const node52 = workflow["52"];
    if (node52) {
      for (const field of COLOR_FIELDS) {
        if (params[field] !== undefined) {
          node52.inputs[field] = params[field];
        }
      }
    }

    // Node 3: KSampler — update seed for randomness
    const node3 = workflow["3"];
    if (node3) {
      node3.inputs.seed = params.seed;
    }

    // Submit to local ComfyUI
    const promptId = await queuePrompt(workflow as Record<string, unknown>);
    return NextResponse.json({ jobId: promptId });
  } catch (error) {
    console.error("Avatar workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run avatar workflow" },
      { status: 500 }
    );
  }
}
