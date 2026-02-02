"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "./image-upload";
import { SelectInput } from "./select-input";
import { BuilderInput } from "./builder-input";
import { SliderInput } from "./slider-input";
import { ButtonGroupInput } from "./button-group-input";
import { VoiceSelectInput } from "./voice-select-input";
import { WorkflowConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface WorkflowFormProps {
  workflow: WorkflowConfig;
  onSubmit: (inputs: Record<string, File | string | number>) => Promise<void>;
  isLoading: boolean;
}

export function WorkflowForm({
  workflow,
  onSubmit,
  isLoading,
}: WorkflowFormProps) {
  const [inputs, setInputs] = useState<Record<string, File | string | number | null>>({});

  // Initialize default values for select, slider, and button-group inputs
  useEffect(() => {
    const defaultInputs: Record<string, File | string | number | null> = {};
    workflow.inputs.forEach((input) => {
      if (input.type === "select" && input.defaultValue) {
        defaultInputs[input.id] = input.defaultValue;
      }
      if (input.type === "slider" && input.defaultValue !== undefined) {
        defaultInputs[input.id] = input.defaultValue;
      }
      if (input.type === "button-group" && input.defaultValue) {
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
      {} as Record<string, File | string | number>
    );

    await onSubmit(validInputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
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
            const defaultVal = typeof input.defaultValue === 'string' ? input.defaultValue : input.options[0];
            return (
              <SelectInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as string) || defaultVal}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
                options={input.options}
                required={input.required}
              />
            );
          }

          if (input.type === "builder" && input.categories) {
            return (
              <BuilderInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as string) || ""}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
                categories={input.categories}
                required={input.required}
              />
            );
          }

          if (input.type === "slider") {
            return (
              <SliderInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as number) ?? (input.defaultValue as number) ?? 1}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
                min={input.min}
                max={input.max}
                step={input.step}
                required={input.required}
              />
            );
          }

          if (input.type === "button-group" && input.options) {
            const defaultVal = typeof input.defaultValue === 'string' ? input.defaultValue : input.options[0];
            return (
              <ButtonGroupInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as string) || defaultVal}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
                options={input.options}
                required={input.required}
              />
            );
          }

          if (input.type === "text") {
            return (
              <div key={input.id} className="space-y-1.5">
                <label className="block text-xs font-medium text-[rgb(var(--foreground))]">
                  {input.label}
                  {input.required && <span className="text-brand-pink ml-1">*</span>}
                </label>
                {input.description && (
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">
                    {input.description}
                  </p>
                )}
                <textarea
                  value={(inputs[input.id] as string) || ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [input.id]: e.target.value }))
                  }
                  placeholder={input.placeholder}
                  required={input.required}
                  rows={4}
                  className={cn(
                    "w-full px-3 py-2 rounded-md text-sm",
                    "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
                    "text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]",
                    "focus:outline-none focus:ring-2 focus:ring-brand-pink/50 focus:border-brand-pink",
                    "resize-none"
                  )}
                />
              </div>
            );
          }

          if (input.type === "voice-select") {
            return (
              <VoiceSelectInput
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as string) || ""}
                onChange={(value) =>
                  setInputs((prev) => ({ ...prev, [input.id]: value }))
                }
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
          "w-full py-2.5 px-4 rounded-md font-medium transition-all text-sm",
          "bg-brand-pink hover:bg-brand-pink-dark text-gray-900",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center justify-center gap-2",
          "shadow-lg hover:shadow-xl hover:shadow-brand-pink/20"
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate
          </>
        )}
      </button>
    </form>
  );
}
