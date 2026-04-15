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
    id: "vellum-piel",
    name: "Vellum Piel",
    description: "AI-powered skin texture enhancement with 4K/8K output.",
    deploymentId: "",
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
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
      },
    ],
  },
  {
    id: "vellum-edad",
    name: "Vellum Edad",
    description: "AI-powered age transformation with 4K/8K output.",
    deploymentId: "",
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
        id: "age",
        name: "age",
        type: "slider",
        label: "Target Age",
        description: "",
        required: true,
        defaultValue: 30,
        min: 10,
        max: 80,
        step: 1,
        suffix: " years",
        decimals: 0,
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
      },
    ],
  },
  {
    id: "vellum-makeup",
    name: "Vellum Makeup",
    description: "AI-powered makeup transfer from a reference image with 4K/8K output.",
    deploymentId: "",
    backend: "runpod",
    inputs: [
      {
        id: "input_image",
        name: "input_image",
        type: "image",
        label: "Model Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "makeup_ref",
        name: "makeup_ref",
        type: "image",
        label: "Makeup Reference",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
      },
    ],
  },
  {
    id: "vellum-pelo",
    name: "Vellum Pelo",
    description: "AI-powered hair style and color transfer from a reference image with 4K/8K output.",
    deploymentId: "",
    backend: "runpod",
    inputs: [
      {
        id: "input_image",
        name: "input_image",
        type: "image",
        label: "Model Image",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "pelo_ref",
        name: "pelo_ref",
        type: "image",
        label: "Hair Reference",
        description: "",
        required: true,
        accept: "image/*",
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
      },
    ],
  },
  {
    id: "vellum-pecas",
    name: "Vellum Pecas",
    description: "AI-powered freckle generation with 4K/8K output.",
    deploymentId: "",
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
        id: "freckle_level",
        name: "freckle_level",
        type: "button-group",
        label: "Freckle Intensity",
        description: "",
        required: true,
        defaultValue: "Pocas",
        options: ["Pocas", "Muchas", "Muchísimas"],
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
      },
    ],
  },
  {
    id: "vellum-orbital",
    name: "Vellum Orbital",
    description: "Genera nuevas perspectivas de cámara orbital (rotación horizontal + inclinación vertical) usando Qwen Image Edit con upscale SeedVR2.",
    deploymentId: "",
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
        id: "horizontal",
        name: "horizontal",
        type: "select",
        label: "Rotación Horizontal",
        description: "",
        required: true,
        defaultValue: "Centro (0°)",
        options: [
          "180° Izq",
          "135° Izq",
          "90° Izq",
          "45° Izq",
          "Centro (0°)",
          "45° Der",
          "90° Der",
          "135° Der",
          "180° Der",
        ],
      },
      {
        id: "vertical",
        name: "vertical",
        type: "select",
        label: "Inclinación Vertical",
        description: "",
        required: true,
        defaultValue: "Centro (0°)",
        options: [
          "-90° (Suelo)",
          "-60° (Bajo ext.)",
          "-45° (Bajo)",
          "-20° (Bajo suave)",
          "Centro (0°)",
          "+20° (Alto suave)",
          "+45° (Alto)",
          "+60° (Alto ext.)",
          "+90° (Techo)",
        ],
      },
      {
        id: "zoom",
        name: "zoom",
        type: "button-group",
        label: "Zoom",
        description: "",
        required: true,
        defaultValue: "Normal",
        options: ["Close-up", "Normal", "Wide"],
      },
      {
        id: "scale_by",
        name: "scale_by",
        type: "button-group",
        label: "Output Resolution",
        description: "",
        required: true,
        defaultValue: "4K",
        options: ["4K", "8K"],
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
        id: "input_audio",
        name: "input_audio",
        type: "audio",
        label: "Audio",
        description: "Upload the audio that will drive the video",
        required: true,
        accept: "audio/*",
      },
      {
        id: "use_elevenlabs_vc",
        name: "use_elevenlabs_vc",
        type: "button-group",
        label: "ElevenLabs Voice Changer",
        description: "Yes: audio will be processed through ElevenLabs Voice Changer. No: use audio as-is (e.g. already generated with ElevenLabs)",
        required: false,
        defaultValue: "Yes",
        options: ["Yes", "No"],
      },
      {
        id: "voice_id",
        name: "voice_id",
        type: "voice-select",
        label: "Select Voice",
        description: "ElevenLabs voice to use when Voice Changer is enabled",
        required: false,
        showWhen: { field: "use_elevenlabs_vc", value: "Yes" },
      },
      {
        id: "positive_prompt",
        name: "positive_prompt",
        type: "text",
        label: "Positive Prompt",
        description: "Describe the scene, motion and expressions for the talking video",
        required: true,
        placeholder: "woman speak to the camera, static camera,",
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

export function getVellumPielWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-piel")!;
}

export function getVellumEdadWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-edad")!;
}

export function getVellumMakeupWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-makeup")!;
}

export function getVellumPecasWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-pecas")!;
}

export function getVellumPeloWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-pelo")!;
}

export function getVellumOrbitalWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "vellum-orbital")!;
}