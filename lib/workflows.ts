import { WorkflowConfig } from "./types";

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
        description: "Upload the primary model image",
        required: true,
        accept: "image/*",
      },
      {
        id: "product_image",
        name: "product_image",
        type: "image",
        label: "Product Image",
        description: "Upload the product to blend with the model",
        required: true,
        accept: "image/*",
      },
      {
        id: "size_preset",
        name: "size_preset",
        type: "select",
        label: "Size Preset",
        description: "Select the output image size",
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
        type: "builder",
        label: "Pose Selection",
        description: "Build your pose by selecting compatible elements",
        required: false,
        categories: [
          {
            id: "shot_type",
            label: "Shot Type",
            options: ["Plano medio", "Plano entero"],
            required: true,
          },
          {
            id: "body_position",
            label: "Body Position",
            options: ["torso de frente", "de pie", "postura recta"],
          },
          {
            id: "arm_position",
            label: "Arm Position",
            options: ["brazos cruzados", "una mano en la cadera"],
          },
          {
            id: "body_orientation",
            label: "Body Orientation",
            options: ["cuerpo ligeramente girado hacia la derecha", "cuerpo recto"],
          },
          {
            id: "head_tilt",
            label: "Head Position",
            options: ["cabeza ligeramente inclinada", "cabeza recta"],
          },
          {
            id: "expression",
            label: "Expression & Gaze",
            options: [
              "mirando a la cámara con expresión segura",
              "expresión relajada y confiada",
            ],
          },
        ],
      },
      {
        id: "background_selection",
        name: "background_selection",
        type: "builder",
        label: "Background Selection",
        description: "Customize your background by selecting elements",
        required: false,
        categories: [
          {
            id: "background_type",
            label: "Background Type",
            options: [
              "Fondo blanco liso de estudio",
              "Estudio interior cálido con tonos marrones suaves",
            ],
            required: true,
          },
          {
            id: "shadow_effect",
            label: "Shadow Effects",
            options: ["suave sombra bajo la modelo"],
          },
          {
            id: "lighting",
            label: "Lighting",
            options: ["iluminación profesional de moda"],
          },
          {
            id: "additional_elements",
            label: "Additional Elements",
            options: [
              "muebles de estilo vintage ligeramente desenfocados en el fondo",
            ],
          },
        ],
      },
    ],
  },
  // Future workflows can be added here:
  // {
  //   id: "style-transfer",
  //   name: "Style Transfer",
  //   description: "Apply artistic styles to your images",
  //   deploymentId: "your-deployment-id",
  //   inputs: [...]
  // },
];

export function getWorkflowById(id: string): WorkflowConfig | undefined {
  return workflows.find((workflow) => workflow.id === id);
}

export function getDefaultWorkflow(): WorkflowConfig {
  return workflows[0];
}
