"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "./image-upload";
import { AudioUpload } from "./audio-upload";
import { VideoUpload } from "./video-upload";
import { SelectInput } from "./select-input";
import { BuilderInput } from "./builder-input";
import { SliderInput } from "./slider-input";
import { ButtonGroupInput } from "./button-group-input";
import { VoiceSelectInput } from "./voice-select-input";
import { AudioModeInput } from "./audio-mode-input";
import { WorkflowConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface WorkflowFormProps {
  workflow: WorkflowConfig;
  onSubmit: (inputs: Record<string, File | string | number>) => Promise<void>;
  isLoading: boolean;
  reusedParameters?: Record<string, string | number> | null;
  onParametersApplied?: () => void;
}

export function WorkflowForm({
  workflow,
  onSubmit,
  isLoading,
  reusedParameters,
  onParametersApplied,
}: WorkflowFormProps) {
  const [inputs, setInputs] = useState<Record<string, File | string | number | null>>({});
  const [audioMode, setAudioMode] = useState<"tts" | "sts">("tts");

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

  // Apply reused parameters from gallery
  useEffect(() => {
    if (!reusedParameters) return;

    setInputs((prev) => {
      const updated = { ...prev };
      for (const [key, value] of Object.entries(reusedParameters)) {
        // Only apply params that match workflow input IDs (skip file-type inputs)
        const matchingInput = workflow.inputs.find((i) => i.id === key);
        if (matchingInput && matchingInput.type !== "image" && matchingInput.type !== "audio" && matchingInput.type !== "video") {
          updated[key] = value;
        }
        // Also apply input_text for audio-mode workflows
        if (key === "input_text" || key === "mode") {
          updated[key] = value;
          if (key === "mode" && (value === "tts" || value === "sts")) {
            setAudioMode(value);
          }
        }
      }
      return updated;
    });

    onParametersApplied?.();
  }, [reusedParameters, workflow, onParametersApplied]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required inputs
    const missingInputs = workflow.inputs
      .filter((input) => {
        // Skip inputs that are hidden by showWhen — they aren't being collected
        if (input.showWhen) {
          const currentValue = inputs[input.showWhen.field];
          const defaultValue = workflow.inputs.find(
            (i) => i.id === input.showWhen!.field
          )?.defaultValue;
          const resolvedValue = currentValue ?? defaultValue;
          if (resolvedValue !== input.showWhen.value) return false;
        }

        if (input.type === "audio-mode") {
          // For audio-mode, validate based on current mode
          if (audioMode === "tts") {
            const text = inputs["input_text"];
            return !text || (typeof text === "string" && text.trim() === "");
          } else {
            return !inputs["input_audio"];
          }
        }
        return input.required && !inputs[input.id];
      })
      .map((input) => {
        if (input.type === "audio-mode") {
          return audioMode === "tts" ? "Text" : "Audio";
        }
        return input.label;
      });

    if (missingInputs.length > 0) {
      alert(`Please provide: ${missingInputs.join(", ")}`);
      return;
    }

    // Determine which inputs are currently hidden by showWhen so we don't
    // submit stale values from a previously-visible field.
    const hiddenInputIds = new Set(
      workflow.inputs
        .filter((input) => {
          if (!input.showWhen) return false;
          const currentValue = inputs[input.showWhen.field];
          const defaultValue = workflow.inputs.find(
            (i) => i.id === input.showWhen!.field
          )?.defaultValue;
          const resolvedValue = currentValue ?? defaultValue;
          return resolvedValue !== input.showWhen.value;
        })
        .map((input) => input.id)
    );

    // Filter out null values and add mode
    const validInputs = Object.entries(inputs).reduce(
      (acc, [key, value]) => {
        if (value === null || value === undefined) return acc;
        if (hiddenInputIds.has(key)) return acc;
        acc[key] = value;
        return acc;
      },
      {} as Record<string, File | string | number>
    );

    // Add the audio mode so the API route knows which path to use
    validInputs["mode"] = audioMode;

    await onSubmit(validInputs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        {workflow.inputs.map((input) => {
          // Conditional visibility
          if (input.showWhen) {
            const currentValue = inputs[input.showWhen.field];
            const defaultValue = workflow.inputs.find(i => i.id === input.showWhen!.field)?.defaultValue;
            const resolvedValue = currentValue ?? defaultValue;
            if (resolvedValue !== input.showWhen.value) return null;
          }
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

          if (input.type === "audio") {
            return (
              <AudioUpload
                key={input.id}
                label={input.label}
                description={input.description}
                value={(inputs[input.id] as File) || null}
                onChange={(file) =>
                  setInputs((prev) => ({ ...prev, [input.id]: file }))
                }
                accept={input.accept}
                required={input.required}
                minDuration={input.minDuration}
                maxDuration={input.maxDuration}
              />
            );
          }

          if (input.type === "video") {
            return (
              <VideoUpload
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

          if (input.type === "audio-mode") {
            return (
              <AudioModeInput
                key={input.id}
                label={input.label}
                description={input.description}
                audioFile={(inputs["input_audio"] as File) || null}
                text={(inputs["input_text"] as string) || ""}
                mode={audioMode}
                onAudioChange={(file) =>
                  setInputs((prev) => ({ ...prev, input_audio: file }))
                }
                onTextChange={(text) =>
                  setInputs((prev) => ({ ...prev, input_text: text }))
                }
                onModeChange={setAudioMode}
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
                suffix={input.suffix}
                decimals={input.decimals}
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
