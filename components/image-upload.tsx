"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";

interface ImageUploadProps {
  label: string;
  description?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  required?: boolean;
}

export function ImageUpload({
  label,
  description,
  value,
  onChange,
  accept = "image/*",
  required = false,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
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
          id={`upload-${label}`}
        />

        {value ? (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[rgb(var(--foreground))] truncate">
                {value.name}
              </p>
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
            htmlFor={`upload-${label}`}
            className="flex items-center justify-center cursor-pointer py-1"
          >
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Click to upload image
            </p>
          </label>
        )}
      </div>
    </div>
  );
}
