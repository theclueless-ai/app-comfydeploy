import { NextRequest, NextResponse } from "next/server";
import { queuePrompt } from "@/lib/comfyui-local";
import avatarWorkflow from "@/lib/avatar-workflow.json";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Deep clone the workflow template
    const workflow = JSON.parse(JSON.stringify(avatarWorkflow)) as Record<string, Record<string, Record<string, unknown>>>;

    // Inject CharacterPortraitGenerator parameters (Node 252)
    const node252Inputs = workflow["252"]["inputs"];

    // Global settings
    const characterType = formData.get("character_type") as string;
    node252Inputs["character_type"] = characterType || "HUMAN";
    node252Inputs["seed"] = parseInt(formData.get("seed") as string) || 0;
    node252Inputs["render_style"] = (formData.get("render_style") as string) || "RANDOM";
    node252Inputs["lighting"] = (formData.get("lighting") as string) || "RANDOM";
    node252Inputs["background"] = (formData.get("background") as string) || "white studio background";

    // Human features (A_ prefix)
    const humanFields = [
      "A_gender", "A_ethnicity", "A_age_range", "A_face_aspect", "A_skin_tone", "A_face_shape",
      "A_hair_color", "A_hair_style", "A_eye_color", "A_eye_shape",
      "A_nose", "A_lips", "A_freckles", "A_expression", "A_distinctive_features",
    ];
    for (const field of humanFields) {
      const value = formData.get(field) as string;
      if (value) {
        node252Inputs[field] = value;
      }
    }

    // Non-human features (B_ prefix)
    const nonhumanFields = [
      "B_skin_texture", "B_skin_color", "B_eyes", "B_face_structure", "B_organic_additions",
    ];
    for (const field of nonhumanFields) {
      const value = formData.get(field) as string;
      if (value) {
        node252Inputs[field] = value;
      }
    }

    // Inject Color Grading parameters (Node 52)
    const node52Inputs = workflow["52"]["inputs"];
    const colorFields = ["temperature", "hue", "brightness", "contrast", "saturation", "gamma"];
    for (const field of colorFields) {
      const value = formData.get(field);
      if (value !== null && value !== "") {
        node52Inputs[field] = parseFloat(value as string);
      }
    }

    // Queue the prompt in local ComfyUI
    const promptId = await queuePrompt(workflow as unknown as Record<string, unknown>);

    return NextResponse.json({ promptId });
  } catch (error) {
    console.error("Avatar workflow error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run avatar workflow" },
      { status: 500 }
    );
  }
}
