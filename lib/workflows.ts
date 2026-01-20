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
