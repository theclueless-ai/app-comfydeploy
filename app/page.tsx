"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { WorkflowForm } from "@/components/workflow-form";
import { ResultDisplay } from "@/components/result-display";
import { getDefaultWorkflow } from "@/lib/workflows";
import { cn } from "@/lib/utils";

type RunStatus = "queued" | "running" | "completed" | "failed" | null;

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>(null);
  const [resultImages, setResultImages] = useState<Array<{ url: string; filename: string }>>([]);
  const [error, setError] = useState<string>();

  const workflow = getDefaultWorkflow();

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

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-brand-pink via-brand-pink-light to-brand-pink bg-clip-text text-transparent">
              {workflow.name}
            </h2>
            <p className="text-lg text-[rgb(var(--muted-foreground))] max-w-2xl mx-auto">
              {workflow.description}
            </p>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Input Section */}
            <div
              className={cn(
                "rounded-xl border p-6 md:p-8 animate-slide-up",
                "bg-[rgb(var(--card))] border-[rgb(var(--border))]",
                "shadow-lg"
              )}
            >
              <h3 className="text-xl font-semibold mb-6">Upload Images</h3>
              <WorkflowForm
                workflow={workflow}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>

            {/* Result Section */}
            <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              {status ? (
                <ResultDisplay
                  status={status}
                  images={resultImages}
                  error={error}
                />
              ) : (
                <div
                  className={cn(
                    "rounded-xl border p-8 h-full flex items-center justify-center",
                    "bg-[rgb(var(--card))] border-[rgb(var(--border))]/50",
                    "border-dashed"
                  )}
                >
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-brand-pink/10 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-brand-pink"
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
                      Your result will appear here
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="mt-12 text-center">
            <p className="text-sm text-[rgb(var(--muted-foreground))]">
              Powered by{" "}
              <span className="text-brand-pink font-semibold">The Clueless AIGENCY S.L.</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
