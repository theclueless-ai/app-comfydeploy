"use client";

import { useState } from "react";
import { ImageUpload } from "./image-upload";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2 } from "lucide-react";

interface PosesFormProps {
  onSubmit: (inputs: Record<string, File | string | number>) => Promise<void>;
  isLoading: boolean;
}

export function PosesForm({ onSubmit, isLoading }: PosesFormProps) {
  const [image, setImage] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!image) {
      alert("Please upload an image");
      return;
    }

    await onSubmit({ image });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ImageUpload
        label="Reference Image"
        description="Upload a portrait photo to generate 9 different head poses"
        value={image}
        onChange={(file) => setImage(file)}
        accept="image/*"
        required
      />

      <p className="text-[10px] text-[rgb(var(--muted-foreground))]/60">
        The workflow will generate 9 variations of the uploaded face with different head rotations and tilts.
      </p>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || !image}
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
            Generating Poses...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Generate Poses
          </>
        )}
      </button>
    </form>
  );
}
