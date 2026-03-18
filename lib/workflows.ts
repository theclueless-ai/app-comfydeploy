import { WorkflowConfig } from "./types";
import workflow_vellum from "./vellum-upscale.json";
import workflow_vellum_v20 from "./vellum-upscale-v20.json";
import workflow_ai_talk from "./ai-talk-workflow.json";

/**
 * Workflow configurations
 * Add new workflows here to make them available in the app
 */
export const workflows: WorkflowConfig[] = [
  {
    id: "model-product-fusion",
    name: "AI Fashion Commerce",
    description: "Real-time image generation for high-volume fashion e-commerce production.",
    deploymentId: "", // This will be read from server env in API route
    inputs: [
      {
        id: "model_image",
        name: "model_image",
        type: "image",
        label: "Model Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "product_image",
        name: "product_image",
        type: "image",
        label: "Product Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "size_preset",
        name: "size_preset",
        type: "select",
        label: "Size Preset",
        description: "",
        required: false,
        defaultValue: "1728x2304 (3:4)",
        options: [
          "1728x2304 (3:4)",
          "1664x2496 (2:3)",
          "1440x2560 (9:16)",
        ],
      },
      {
        id: "Seleccion de pose",
        name: "Seleccion de pose",
        type: "select",
        label: "Pose Selection",
        description: "",
        required: false,
        defaultValue: "Plano medio, torso de frente, brazos cruzados, cuerpo ligeramente girado hacia la derecha, mirando a la cámara con expresión segura",
        options: [
          "Plano medio, torso de frente, brazos cruzados, cuerpo ligeramente girado hacia la derecha, mirando a la cámara con expresión segura",
          "Plano entero, de pie, postura recta con una mano en la cadera, cabeza ligeramente inclinada, expresión relajada y confiada",
        ],
      },
      {
        id: "Seleccion de Fondo",
        name: "Seleccion de Fondo",
        type: "select",
        label: "Background Selection",
        description: "",
        required: false,
        defaultValue: "Fondo blanco liso de estudio, suave sombra bajo la modelo, iluminación profesional de moda",
        options: [
          "Fondo blanco liso de estudio, suave sombra bajo la modelo, iluminación profesional de moda",
          "Estudio interior cálido con tonos marrones suaves, muebles de estilo vintage ligeramente desenfocados en el fondo",
        ],
      },
    ],
  },
  {
    id: "vellum-upscale",
    name: "Vellum 2.1",
    description: "AI-powered image upscaling with skin texture enhancement.",
    deploymentId: "", // Will use COMFYDEPLOY_VELLUM_DEPLOYMENT_ID from env
    backend: "runpod",
    inputs: [
      {
        id: "input_image",
        name: "input_image",
        type: "image",
        label: "Input Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "strength_model",
        name: "strength_model",
        type: "slider",
        label: "Strength Model",
        description: "",
        required: true,
        defaultValue: 0.5,
        min: 0,
        max: 3,
        step: 0.1,
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Scale Factor",
        description: "",
        required: true,
        defaultValue: "2",
        options: ["2", "4", "8"],
      },
    ],
  },
  {
    id: "vellum-upscale-v20",
    name: "Vellum 2.0",
    description: "Legacy AI-powered image upscaling with skin texture enhancement (SeedVR2).",
    deploymentId: "", // Will use COMFYDEPLOY_VELLUM20_DEPLOYMENT_ID from env
    backend: "runpod",
    inputs: [
      {
        id: "input_image",
        name: "input_image",
        type: "image",
        label: "Input Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "strength_model",
        name: "strength_model",
        type: "slider",
        label: "Strength Model",
        description: "",
        required: true,
        defaultValue: 0.5,
        min: 0,
        max: 1,
        step: 0.1,
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Scale Factor",
        description: "",
        required: true,
        defaultValue: "4",
        options: ["2", "4", "8"],
      },
    ],
  },
  {
    id: "ai-talk",
    name: "AI Talk",
    description: "Generate talking head videos with AI-powered lip sync and voice synthesis.",
    deploymentId: "", // Will use COMFYDEPLOY_AITALK_DEPLOYMENT_ID from env
    inputs: [
      {
        id: "input_image",
        name: "input_image",
        type: "image",
        label: "Character Image",
        description: "Upload an image of the character to animate",
        required: true,
        accept: "image/*",
      },
      {
        id: "audio_mode",
        name: "audio_mode",
        type: "audio-mode",
        label: "Audio Source",
        description: "Choose to write text (TTS) or upload audio (Voice Changer)",
        required: true,
      },
      {
        id: "voice_id",
        name: "voice_id",
        type: "voice-select",
        label: "Select Voice",
        description: "ElevenLabs voice for voice changing",
        required: true,
      },
      {
        id: "positive_prompt",
        name: "positive_prompt",
        type: "text",
        label: "Positive Prompt",
        description: "Describe the scene, motion and expressions for the talking video",
        required: true,
        placeholder: "The girl with pink hair smoothly turns her head from the side to face the camera directly...",
      },
      {
        id: "voice_settings_stability",
        name: "voice_settings_stability",
        type: "slider",
        label: "Stability",
        description: "Higher values make the voice more consistent, lower values more expressive",
        required: false,
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        suffix: "",
        decimals: 2,
      },
      {
        id: "voice_settings_similarity_boost",
        name: "voice_settings_similarity_boost",
        type: "slider",
        label: "Similarity Boost",
        description: "How closely the AI should match the original voice",
        required: false,
        defaultValue: 0.85,
        min: 0,
        max: 1,
        step: 0.05,
        suffix: "",
        decimals: 2,
      },
      {
        id: "voice_settings_style",
        name: "voice_settings_style",
        type: "slider",
        label: "Style Exaggeration",
        description: "Higher values amplify the style of the original speaker",
        required: false,
        defaultValue: 0.3,
        min: 0,
        max: 1,
        step: 0.05,
        suffix: "",
        decimals: 2,
      },
      {
        id: "voice_settings_speed",
        name: "voice_settings_speed",
        type: "slider",
        label: "Speed",
        description: "Speech speed multiplier",
        required: false,
        defaultValue: 1,
        min: 0.5,
        max: 2,
        step: 0.05,
        suffix: "x",
        decimals: 2,
      },
      {
        id: "voice_settings_use_speaker_boost",
        name: "voice_settings_use_speaker_boost",
        type: "button-group",
        label: "Speaker Boost",
        description: "Enhance speaker clarity and similarity",
        required: false,
        defaultValue: "On",
        options: ["On", "Off"],
      },
    ],
  },
];

export function getWorkflowById(id: string): WorkflowConfig | undefined {
  return workflows.find((workflow) => workflow.id === id);
}

export function getDefaultWorkflow(): WorkflowConfig {
  return workflows[0];
}

export function getVellumWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-upscale")!;
}

export function getVellum20Workflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-upscale-v20")!;
}

export function getAiTalkWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "ai-talk")!;
}