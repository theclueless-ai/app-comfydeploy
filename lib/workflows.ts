import { WorkflowConfig } from "./types";

/**
 * Workflow configurations
 * Add new workflows here to make them available in the app
 */
export const workflows: WorkflowConfig[] = [
  {
    id: "model-product-fusion",
    name: "Model & Product Fusion",
    description: "Seamlessly blend a model with your product for stunning fashion visuals",
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
