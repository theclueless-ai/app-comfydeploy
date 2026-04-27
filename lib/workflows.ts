import { WorkflowConfig } from "./types";
import workflow_vellum from "./vellum-upscale.json";
import workflow_vellum_v20 from "./vellum-upscale-v20.json";
import workflow_video_translate from "./video-translate.json";

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
    id: "video-translate",
    name: "Video Translate",
    description: "Transcribe un vídeo o audio, traduce al inglés y genera una nueva pista de audio con ElevenLabs.",
    deploymentId: "",
    backend: "runpod",
    inputs: [
      {
        id: "media_type",
        name: "media_type",
        type: "button-group",
        label: "Tipo de archivo",
        description: "Elige si vas a subir un vídeo o un archivo de audio.",
        required: true,
        defaultValue: "video",
        options: ["video", "audio"],
      },
      {
        id: "input_video",
        name: "input_video",
        type: "video",
        label: "Input Video",
        description: "Sube un vídeo .mp4 — se extraerá el audio, se transcribirá y se traducirá a inglés",
        required: true,
        accept: "video/mp4",
        showWhen: { field: "media_type", value: "video" },
      },
      {
        id: "input_audio",
        name: "input_audio",
        type: "audio",
        label: "Input Audio",
        description: "Sube un archivo de audio (mp3, wav, flac, m4a, ogg) — se transcribirá y se traducirá a inglés",
        required: true,
        accept: "audio/*",
        showWhen: { field: "media_type", value: "audio" },
      },
    ],
  },
  {
    id: "ai-talk",
    name: "AI Talk",
    description: "Generate a 9-segment talking video via the Seedance API.",
    deploymentId: "",
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
        id: "input_audio",
        name: "input_audio",
        type: "audio",
        label: "Audio (max 90 s)",
        description: "Up to 90 s. The workflow slices it into 10 s segments and skips any segment shorter than 4 s.",
        required: true,
        accept: "audio/*",
        maxDuration: 90,
      },
      {
        id: "prompt_prefix",
        name: "prompt_prefix",
        type: "text",
        label: "Prompt Prefix",
        description: "Prefix prepended to every Seedance segment before the transcribed text. Applied to both nodes 100 and 309.",
        required: false,
        placeholder: "The person looks at the camera and says:",
      },
      {
        id: "resolution",
        name: "resolution",
        type: "button-group",
        label: "Resolution",
        description: "Resolution sent to every Seedance call.",
        required: false,
        defaultValue: "1080p",
        options: ["480p", "720p", "1080p"],
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

export function getVideoTranslateWorkflow(): WorkflowConfig {
  return workflows.find((w) => w.id === "video-translate")!;
}