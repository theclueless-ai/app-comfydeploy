"use client";

import { useState, useRef } from "react";
import { X, Music } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

interface AudioUploadProps {
  label: string;
  description?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
  minDuration?: number;
  maxDuration?: number;
  maxSizeMB?: number;
  // Optional upload progress (0-1). When provided, the picker shows a bar.
  uploadProgress?: number | null;
}

function probeAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read audio metadata"));
    };
    audio.src = url;
  });
}

export function AudioUpload({
  label,
  description,
  value,
  onChange,
  accept = "audio/*",
  required = false,
  minDuration,
  maxDuration,
  maxSizeMB = 50,
  uploadProgress,
}: AudioUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file");
      return;
    }

    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      alert(
        `File is too large (${formatBytes(file.size)}). Please use an audio file smaller than ${maxSizeMB}MB.`
      );
      return;
    }

    if ((minDuration && minDuration > 0) || (maxDuration && maxDuration > 0)) {
      try {
        const duration = await probeAudioDuration(file);
        if (minDuration && duration < minDuration) {
          alert(
            `Audio is ${duration.toFixed(1)}s but this workflow requires at least ${minDuration}s.`
          );
          return;
        }
        if (maxDuration && duration > maxDuration) {
          alert(
            `Audio is ${duration.toFixed(1)}s but this workflow accepts at most ${maxDuration}s.`
          );
          return;
        }
      } catch {
        alert("Could not read the audio duration. Please try a different file.");
        return;
      }
    }

    onChange(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const clearFile = () => {
    handleFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-medium mb-1 text-[rgb(var(--muted-foreground))]">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-[rgb(var(--muted-foreground))] mb-1">
          {description}
        </p>
      )}

      <div
        className={cn(
          "relative border border-solid rounded-md transition-all px-3 py-2",
          dragActive
            ? "border-brand-pink bg-brand-pink/5"
            : "border-[rgb(var(--border-input))] hover:border-brand-pink/50",
          "bg-[rgb(var(--input))]"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id={`upload-audio-${label}`}
        />

        {value ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Music className="w-4 h-4 text-brand-pink flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[rgb(var(--foreground))] truncate">
                    {value.name}
                  </p>
                  <p className="text-xs text-[rgb(var(--muted-foreground))]">
                    {formatBytes(value.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                disabled={typeof uploadProgress === "number"}
                className="flex-shrink-0 p-1 rounded-md bg-[rgb(var(--secondary))] hover:bg-[rgb(var(--accent))] text-[rgb(var(--foreground))] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                title="Remove file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            {typeof uploadProgress === "number" && (
              <div>
                <div className="h-1 w-full overflow-hidden rounded bg-[rgb(var(--secondary))]">
                  <div
                    className="h-full bg-brand-pink transition-[width] duration-150 ease-linear"
                    style={{ width: `${Math.min(100, Math.max(0, uploadProgress * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
                  Subiendo a S3... {Math.round(Math.min(1, Math.max(0, uploadProgress)) * 100)}%
                </p>
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor={`upload-audio-${label}`}
            className="flex items-center justify-center cursor-pointer py-1 gap-2"
          >
            <Music className="w-4 h-4 text-[rgb(var(--muted-foreground))]" />
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Click to upload audio
            </p>
          </label>
        )}
      </div>
    </div>
  );
}
