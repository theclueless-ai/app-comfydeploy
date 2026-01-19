"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "./image-upload";
import { SelectInput } from "./select-input";
import { WorkflowConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface WorkflowFormProps {
  workflow: WorkflowConfig;
  onSubmit: (inputs: Record<string, File | string>) => Promise<void>;
  isLoading: boolean;
}

export function WorkflowForm({
  workflow,
  onSubmit,
  isLoading,
}: WorkflowFormProps) {
  const [inputs, setInputs] = useState<Record<string, File | string | null>>({});

  // Initialize default values for select inputs
  useEffect(() => {
    const defaultInputs: Record<string, File | string | null> = {};
    workflow.inputs.forEach((input) => {
      if (input.type === "select" && input.defaultValue) {
        defaultInputs[input.id] = input.defaultValue;
      }
    });
    setInputs(defaultInputs);
  }, [workflow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required inputs
    const missingInputs = workflow.inputs
      .filter((input) => input.required && !inputs[input.id])
      .map((input) => input.label);

    if (missingInputs.length > 0) {
      alert(`Please provide: ${missingInputs.join(", ")}`);
      return;
    }

    // Filter out null values
    const validInputs = Object.entries(inputs).reduce(
      (acc, [key, value]) => {
        if (value !== null && value !== undefined) acc[key] = value;
        return acc;
      },
      {} as Record<string, File | string>
    );

    await onSubmit(validInputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        {workflow.inputs.map((input) => {
          if (input.type === "image") {
            return (
              <ImageUpload
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as File) || null}
                onChange={(file) =>
                  setInputs((prev) => ({ ...prev, [input.id]: file }))
                }
                accept={input.accept}
                required={input.required}
              />
            );
          }

          if (input.type === "select" && input.options) {
            return (
              <SelectInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as string) || input.defaultValue || input.options[0]}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
                options={input.options}
                required={input.required}
              />
            );
          }

          return null;
        })}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full py-4 px-6 rounded-lg font-medium transition-all",
          "bg-brand-pink hover:bg-brand-pink-dark text-gray-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2",
          "shadow-lg hover:shadow-xl hover:shadow-brand-pink/20"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate
          </>
        )}
      </button>
    </form>
  );
}
