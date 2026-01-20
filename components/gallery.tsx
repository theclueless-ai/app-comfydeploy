"use client";

import { useState } from "react";
import { Download, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { HistoryRun, formatTimestamp } from "@/lib/history";

interface GalleryProps {
  history: HistoryRun[];
  onClearHistory: () => void;
}

export function Gallery({ history, onClearHistory }: GalleryProps) {
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    filename: string;
    runId: string;
    timestamp: number;
  } | null>(null);

  // Get all images flattened with metadata
  const allImages = history.flatMap((run) =>
    run.images.map((img) => ({
      ...img,
      runId: run.runId,
      timestamp: run.timestamp,
      workflowName: run.workflowName,
    }))
  );

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleImageClick = (image: typeof allImages[0]) => {
    setSelectedImage(image);
  };

  const handleCloseModal = () => {
    setSelectedImage(null);
  };

  const handleNextImage = () => {
    if (!selectedImage) return;
    const currentIndex = allImages.findIndex(
      (img) => img.url === selectedImage.url
    );
    const nextIndex = (currentIndex + 1) % allImages.length;
    setSelectedImage(allImages[nextIndex]);
  };

  const handlePrevImage = () => {
    if (!selectedImage) return;
    const currentIndex = allImages.findIndex(
      (img) => img.url === selectedImage.url
    );
    const prevIndex = (currentIndex - 1 + allImages.length) % allImages.length;
    setSelectedImage(allImages[prevIndex]);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm text-[rgb(var(--muted-foreground))]">
          No images generated yet
        </p>
        <p className="text-xs text-[rgb(var(--muted-foreground))] mt-1">
          Your generated images will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-300">
            History
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {allImages.length} image{allImages.length !== 1 ? "s" : ""} from {history.length} run{history.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClearHistory}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
          )}
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {allImages.map((image, index) => (
          <div
            key={`${image.runId}-${index}`}
            className={cn(
              "group relative aspect-square rounded-lg overflow-hidden cursor-pointer",
              "bg-gray-800/50 border border-gray-700 hover:border-brand-pink/50",
              "transition-all duration-200"
            )}
            onClick={() => handleImageClick(image)}
          >
            <img
              src={image.url}
              alt={image.filename}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-xs text-white truncate">{image.filename}</p>
                <p className="text-xs text-gray-300 mt-0.5">
                  {formatTimestamp(image.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation Buttons */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                className="absolute left-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                className="absolute right-4 p-2 rounded-full bg-gray-800/80 hover:bg-gray-700 text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          <div
            className="max-w-4xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            <div className="mt-4 bg-gray-800/90 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedImage.filename}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimestamp(selectedImage.timestamp)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    handleDownload(selectedImage.url, selectedImage.filename)
                  }
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    "bg-brand-pink hover:bg-brand-pink-dark text-gray-900"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
