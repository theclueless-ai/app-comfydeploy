import { WorkflowConfig } from "./types";
import workflow_vellum from "./vellum-upscale.json";
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
        defaultValue: "2048x2048 (1:1)",
        options: [
          "2048x2048 (1:1)",
          "2304x1728 (4:3)",
          "1728x2304 (3:4)",
          "2560x1440 (16:9)",
          "1440x2560 (9:16)",
          "2496x1664 (3:2)",
          "1664x2496 (2:3)",
          "3024x1296 (21:9)",
          "4096x4096 (1:1)",
          "Custom",
        ],
      },
      {
        id: "pose_selection",
        name: "pose_selection",
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
        id: "background_selection",
        name: "background_selection",
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
    name: "Vellum 2.0",
    description: "AI-powered image upscaling with skin texture enhancement.",
    deploymentId: "", // Will use COMFYDEPLOY_VELLUM_DEPLOYMENT_ID from env
    backend: "runpod", // Changed from "runpod" to use ComfyDeploy temporarily
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
        step: 0.05,
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
    id: "ai-talk",
    name: "AI Talk",
    description: "Generate talking head videos with AI-powered lip sync and voice synthesis.",
    deploymentId: "", // Will use RUNPOD_AITALK_ENDPOINT_ID from env
    backend: "runpod",
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
        id: "voice_id",
        name: "voice_id",
        type: "voice-select",
        label: "Select Voice",
        description: "",
        required: true,
      },
      {
        id: "speech_text",
        name: "speech_text",
        type: "text",
        label: "Speech Text",
        description: "",
        required: true,
        placeholder: "Enter the text for the character to speak...",
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

export function getAiTalkWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "ai-talk")!;
}
