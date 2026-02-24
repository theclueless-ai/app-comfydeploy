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
}

export function AudioUpload({
  label,
  description,
  value,
  onChange,
  accept = "audio/*",
  required = false,
}: AudioUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    if (!file.type.startsWith("audio/")) {
      alert("Please upload an audio file");
      return;
    }

    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      alert(`File is too large (${formatBytes(file.size)}). Please use an audio file smaller than 50MB.`);
      return;
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
              className="flex-shrink-0 p-1 rounded-md bg-[rgb(var(--secondary))] hover:bg-[rgb(var(--accent))] text-[rgb(var(--foreground))] transition-colors"
              type="button"
              title="Remove file"
            >
              <X className="w-3 h-3" />
            </button>
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
