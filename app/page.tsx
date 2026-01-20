"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { WorkflowForm } from "@/components/workflow-form";
import { ResultDisplay } from "@/components/result-display";
import { Gallery } from "@/components/gallery";
import { getDefaultWorkflow } from "@/lib/workflows";
import { cn } from "@/lib/utils";
import { useHistory } from "@/hooks/use-history";
import { History } from "lucide-react";

type RunStatus = "queued" | "running" | "completed" | "failed" | null;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>(null);
  const [resultImages, setResultImages] = useState<Array<{ url: string; filename: string }>>([]);
  const [error, setError] = useState<string>();
  const [showGallery, setShowGallery] = useState(false);

  const workflow = getDefaultWorkflow();
  const { history, totalImages, addToHistory, clearHistory } = useHistory();

  // Poll for webhook results
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        // First check webhook endpoint
        const webhookResponse = await fetch(`/api/webhook?runId=${runId}`);
        const webhookData = await webhookResponse.json();

        console.log("Webhook data:", webhookData);

        if (webhookData.status === "completed") {
          setStatus("completed");
          if (webhookData.images && webhookData.images.length > 0) {
            setResultImages(webhookData.images);
            console.log(`Received ${webhookData.images.length} images from webhook`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
          return;
        }

        if (webhookData.status === "failed") {
          setStatus("failed");
          setError(webhookData.error);
          clearInterval(pollInterval);
          setIsLoading(false);
          return;
        }

        // Fallback to status API
        const statusResponse = await fetch(`/api/status/${runId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();

          console.log("Status data:", statusData);

          if (statusData.status === "completed") {
            setStatus("completed");
            if (statusData.images && statusData.images.length > 0) {
              setResultImages(statusData.images);
              console.log(`Received ${statusData.images.length} images from status API`);
            }
            clearInterval(pollInterval);
            setIsLoading(false);
          } else if (statusData.status === "failed") {
            setStatus("failed");
            setError(statusData.error);
            clearInterval(pollInterval);
            setIsLoading(false);
          } else if (statusData.status === "running") {
            setStatus("running");
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status]);

  // Save to history when run completes successfully
  useEffect(() => {
    if (status === "completed" && resultImages.length > 0 && runId) {
      addToHistory({
        runId,
        images: resultImages,
        workflowName: workflow.name,
      });
    }
  }, [status, resultImages, runId, workflow.name, addToHistory]);

  const handleSubmit = async (inputs: Record<string, File | string>) => {
    setIsLoading(true);
    setStatus("queued");
    setError(undefined);
    setResultImages([]);

    try {
      const formData = new FormData();
      // Add all inputs (files and text values)
      Object.entries(inputs).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, value);
        }
      });

      const response = await fetch("/api/run-workflow", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run workflow");
      }

      setRunId(data.runId);
      setStatus("running");
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("failed");
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="mb-6 animate-fade-in">
            <h2 className="font-work-sans text-md md:text-xl font-bold mb-2 bg-gradient-to-r from-brand-pink via-brand-pink-light to-brand-pink bg-clip-text text-transparent">
              {workflow.name}
            </h2>
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              {workflow.description}
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-[380px_1fr] gap-6 items-start">
            {/* Input Section */}
            <div
              className={cn(
                "rounded-lg border p-4 animate-slide-up",
                "bg-[rgb(var(--card))] border-[rgb(var(--border))]",
                "shadow-lg"
              )}
            >
              <h3 className="text-sm font-semibold mb-3 text-gray-400">Upload Images</h3>
              <WorkflowForm
                workflow={workflow}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>

            {/* Result Section */}
            <div className="animate-slide-up sticky top-4" style={{ animationDelay: "100ms" }}>
              {status ? (
                <ResultDisplay
                  status={status}
                  images={resultImages}
                  error={error}
                />
              ) : (
                <div
                  className={cn(
                    "rounded-lg border p-6 flex items-center justify-center",
                    "bg-[rgb(var(--card))] border-[rgb(var(--border))]/50",
                    "border-dashed min-h-[250px]"
                  )}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-brand-pink/10 flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-brand-pink"
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
                    <p className="text-xs text-[rgb(var(--muted-foreground))]">
                      Your result will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gallery Section */}
          {totalImages > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowGallery(!showGallery)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all mb-4",
                  showGallery
                    ? "bg-brand-pink text-gray-900"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                )}
              >
                <History className="w-4 h-4" />
                {showGallery ? "Hide" : "Show"} History ({totalImages} image{totalImages !== 1 ? "s" : ""})
              </button>

              {showGallery && (
                <div className="animate-slide-up">
                  <Gallery history={history} onClearHistory={clearHistory} />
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Powered by{" "}
              <span className="text-brand-pink font-semibold">The Clueless AIGENCY S.L.</span>
              <br />
              <span className="text-brand-pink font-semibold">hello@theclueless.ai</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
