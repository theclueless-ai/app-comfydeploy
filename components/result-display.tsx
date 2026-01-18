"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ResultDisplayProps {
  status: "queued" | "running" | "completed" | "failed" | null;
  images?: Array<{
    url: string;
    filename: string;
  }>;
  error?: string;
}

export function ResultDisplay({ status, images, error }: ResultDisplayProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (!status) {
    return null;
  }

  const handleDownload = async (imageUrl: string, filename: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `theclueless-result-${index + 1}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download image");
    } finally {
      setDownloadingIndex(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <div
        className={cn(
          "rounded-lg border p-6",
          "bg-[rgb(var(--card))] border-[rgb(var(--border))]"
        )}
      >
        {/* Status Header */}
        <div className="flex items-center gap-3 mb-4">
          {status === "queued" && (
            <>
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">Queued</span>
            </>
          )}
          {status === "running" && (
            <>
              <Loader2 className="w-5 h-5 text-brand-pink animate-spin" />
              <span className="text-sm font-medium">Processing...</span>
            </>
          )}
          {status === "completed" && (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium">Completed - {images?.length || 0} {images?.length === 1 ? 'image' : 'images'}</span>
            </>
          )}
          {status === "failed" && (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium">Failed</span>
            </>
          )}
        </div>

        {/* Content */}
        {status === "running" && (
          <div className="py-8 text-center">
            <p className="text-sm text-[rgb(var(--muted-foreground))]">
              Your workflow is being processed. This may take a few moments...
            </p>
          </div>
        )}

        {status === "completed" && images && images.length > 0 && (
          <div className="space-y-4">
            {/* Images Grid */}
            <div className={cn(
              "grid gap-4",
              images.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}>
              {images.map((image, index) => (
                <div key={index} className="space-y-2">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                    <Image
                      src={image.url}
                      alt={`Generated result ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    onClick={() => handleDownload(image.url, image.filename, index)}
                    disabled={downloadingIndex === index}
                    className={cn(
                      "w-full py-2 px-3 rounded-lg text-sm font-medium transition-all",
                      "bg-[rgb(var(--secondary))] hover:bg-[rgb(var(--accent))]",
                      "border border-[rgb(var(--border))]",
                      "flex items-center justify-center gap-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {downloadingIndex === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download {images.length > 1 ? `#${index + 1}` : ''}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="py-4">
            <p className="text-sm text-red-500">
              {error || "An error occurred while processing your workflow."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
