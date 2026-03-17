"use client";

import { useState } from "react";
import { Download, Loader2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ResultDisplayProps {
  status: "queued" | "running" | "completed" | "failed" | null;
  images?: Array<{
    url: string;
    filename: string;
  }>;
  error?: string;
  onGeneratePoses?: (imageUrl: string) => void;
}

export function ResultDisplay({ status, images, error, onGeneratePoses }: ResultDisplayProps) {
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  if (!status) {
    return null;
  }

  const isVideoFile = (filename: string, url: string) => {
    const lower = (filename || "").toLowerCase();
    return lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov") || url.includes("ai-talk-video");
  };

  const handleDownload = async (imageUrl: string, filename: string, index: number) => {
    setDownloadingIndex(index);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = isVideoFile(filename, imageUrl) ? ".mp4" : ".png";
      a.download = filename || `theclueless-result-${index + 1}${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      alert("No se pudo descargar el archivo.");
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
              <span className="text-sm font-medium">Completed - {images?.length || 0} {images?.length === 1 ? 'result' : 'results'}</span>
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
                  {isVideoFile(image.filename, image.url) ? (
                    <div className="relative w-full overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                      <video
                        src={image.url}
                        controls
                        autoPlay
                        loop
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-[rgb(var(--border))]">
                      <Image
                        src={image.url}
                        alt={`Generated result ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(image.url, image.filename, index)}
                      disabled={downloadingIndex === index}
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
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
                    {onGeneratePoses && !isVideoFile(image.filename, image.url) && (
                      <button
                        onClick={() => onGeneratePoses(image.url)}
                        className={cn(
                          "py-2 px-3 rounded-lg text-sm font-medium transition-all",
                          "bg-brand-pink/20 hover:bg-brand-pink/30 text-brand-pink",
                          "border border-brand-pink/30",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Poses
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="py-4 space-y-3">
            <p className="text-sm text-red-500">
              {error || "Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo."}
            </p>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Si el problema persiste, contacta a soporte.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
