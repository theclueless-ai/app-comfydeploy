"use client";

import { useState } from "react";
import { AudioUpload } from "./audio-upload";
import { cn } from "@/lib/utils";
import { Type, Music } from "lucide-react";

interface AudioModeInputProps {
  label: string;
  description?: string;
  audioFile: File | null;
  text: string;
  mode: "tts" | "sts";
  onAudioChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  onModeChange: (mode: "tts" | "sts") => void;
  required?: boolean;
}

export function AudioModeInput({
  label,
  description,
  audioFile,
  text,
  mode,
  onAudioChange,
  onTextChange,
  onModeChange,
  required = false,
}: AudioModeInputProps) {
  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-medium text-[rgb(var(--foreground))]">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-[rgb(var(--muted-foreground))]">
          {description}
        </p>
      )}

      {/* Mode toggle */}
      <div className="flex rounded-md overflow-hidden border border-[rgb(var(--border))]">
        <button
          type="button"
          onClick={() => onModeChange("tts")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all",
            mode === "tts"
              ? "bg-brand-pink text-gray-900"
              : "bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          )}
        >
          <Type className="w-3.5 h-3.5" />
          Write Text
        </button>
        <button
          type="button"
          onClick={() => onModeChange("sts")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all",
            mode === "sts"
              ? "bg-brand-pink text-gray-900"
              : "bg-[rgb(var(--card))] text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]"
          )}
        >
          <Music className="w-3.5 h-3.5" />
          Upload Audio
        </button>
      </div>

      {/* Content based on mode */}
      {mode === "tts" ? (
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter the text the character should speak..."
          rows={4}
          className={cn(
            "w-full px-3 py-2 rounded-md text-sm",
            "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
            "text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]",
            "focus:outline-none focus:ring-2 focus:ring-brand-pink/50 focus:border-brand-pink",
            "resize-none"
          )}
        />
      ) : (
        <AudioUpload
          label=""
          value={audioFile}
          onChange={onAudioChange}
          accept="audio/*"
          required={false}
        />
      )}
    </div>
  );
}
