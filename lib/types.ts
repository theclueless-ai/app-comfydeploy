export interface BuilderCategory {
  id: string;
  label: string;
  options: string[];
  required?: boolean;
  exclusiveWith?: string[]; // IDs of other categories that are mutually exclusive
}

export interface WorkflowInput {
  id: string;
  name: string;
  type: "image" | "text" | "number" | "select" | "builder";
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  accept?: string;
  categories?: BuilderCategory[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  deploymentId: string;
  inputs: WorkflowInput[];
}

export interface RunStatus {
  runId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: number;
  outputs?: {
    images?: string[];
    [key: string]: any;
  };
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface WebhookPayload {
  runId: string;
  status: string;
  outputs?: {
    images?: Array<{
      url: string;
      filename: string;
    }>;
    [key: string]: any;
  };
  error?: string;
}
