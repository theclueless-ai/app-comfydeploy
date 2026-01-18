"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import Image from "next/image";

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
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      setPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    onChange(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
      <label className="block text-sm font-medium mb-2">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-[rgb(var(--muted-foreground))] mb-3">
          {description}
        </p>
      )}

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all",
          dragActive
            ? "border-brand-pink bg-brand-pink/5"
            : "border-[rgb(var(--border))] hover:border-brand-pink/50",
          preview ? "p-0" : "p-8"
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

        {preview ? (
          <div className="relative group">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
              <Image
                src={preview}
                alt={label}
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <button
                onClick={clearFile}
                className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-3 transition-colors"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {value && (
              <div className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                {value.name} ({formatBytes(value.size)})
              </div>
            )}
          </div>
        ) : (
          <label
            htmlFor={`upload-${label}`}
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-brand-pink/10 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-brand-pink" />
            </div>
            <p className="text-sm font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              PNG, JPG, WEBP up to 10MB
            </p>
          </label>
        )}
      </div>
    </div>
  );
}
