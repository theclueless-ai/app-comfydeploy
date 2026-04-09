"use client";

import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { WorkflowForm } from "@/components/workflow-form";
import { AvatarForm } from "@/components/avatar-form";
import { PosesForm } from "@/components/poses-form";
import { ResultDisplay } from "@/components/result-display";
import { Gallery } from "@/components/gallery";
import { WorkflowTabs, WorkflowTab } from "@/components/workflow-tabs";
import { getDefaultWorkflow, getVellumWorkflow, getVellum20Workflow, getVellumPielWorkflow, getVellumEdadWorkflow, getVellumMakeupWorkflow, getVellumPeloWorkflow, getVellumPecasWorkflow, getAiTalkWorkflow } from "@/lib/workflows";
import { cn, compressImage } from "@/lib/utils";
import { sanitizeErrorMessage } from "@/lib/error-messages";
import { useHistory } from "@/hooks/use-history";
import { useAuth } from "@/components/auth-provider";
import { History } from "lucide-react";

type RunStatus = "queued" | "running" | "completed" | "failed" | null;

export default function Home() {
  const [activeTab, setActiveTab] = useState<WorkflowTab>("fashion");
  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<RunStatus>(null);
  const [resultImages, setResultImages] = useState<Array<{ url: string; filename: string }>>([]);
  const [error, setError] = useState<string>();
  const [showGallery, setShowGallery] = useState(false);

  // Track submitted parameters for saving with history
  const lastSubmittedParams = useRef<Record<string, string | number> | null>(null);

  const { user } = useAuth();
  const isAuthenticated = !!user;

  const fashionWorkflow = getDefaultWorkflow();
  const vellumWorkflow = getVellumWorkflow();
  const vellum20Workflow = getVellum20Workflow();
  const vellumPielWorkflow = getVellumPielWorkflow();
  const vellumEdadWorkflow = getVellumEdadWorkflow();
  const vellumMakeupWorkflow = getVellumMakeupWorkflow();
  const vellumPeloWorkflow = getVellumPeloWorkflow();
  const vellumPecasWorkflow = getVellumPecasWorkflow();
  const aiTalkWorkflow = getAiTalkWorkflow();
  const avatarInfo = { name: "Avatar Generator", description: "Generate unique character portraits with customizable features, powered by RunPod serverless." };
  const posesInfo = { name: "Poses", description: "Generate 9 different head poses from a single portrait, powered by RunPod serverless." };
  const workflow = activeTab === "fashion"
    ? fashionWorkflow
    : activeTab === "vellum"
      ? vellumWorkflow
      : activeTab === "vellum20"
        ? vellum20Workflow
        : activeTab === "vellumPiel"
          ? vellumPielWorkflow
          : activeTab === "vellumEdad"
            ? vellumEdadWorkflow
            : activeTab === "vellumMakeup"
              ? vellumMakeupWorkflow
              : activeTab === "vellumPelo"
                ? vellumPeloWorkflow
                : activeTab === "vellumPecas"
                  ? vellumPecasWorkflow
                  : activeTab === "aiTalk"
                    ? aiTalkWorkflow
                    : null;
  const activeWorkflowName = activeTab === "poses" ? posesInfo.name : (workflow?.name ?? avatarInfo.name);
  const activeWorkflowDescription = activeTab === "poses" ? posesInfo.description : (workflow?.description ?? avatarInfo.description);

  const { history, totalImages, addToHistory, clearHistory } = useHistory({ isAuthenticated });

  // Reset state when changing tabs
  const handleTabChange = (tab: WorkflowTab) => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setIsLoading(false);
      setRunId(null);
      setStatus(null);
      setResultImages([]);
      setError(undefined);
    }
  };

  // Poll for results via ComfyDeploy status API (fashion workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "fashion") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/status/${runId}`);
        if (!res.ok) return; // transient error, retry next tick

        const data = await res.json();

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from status API`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error);
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellum") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-status?jobId=${runId}`);
        const data = await response.json();

        console.log("vellum status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from RunPod`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum 2.0 legacy workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellum20") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum20-status?jobId=${runId}`);
        const data = await response.json();

        console.log("vellum 2.0 status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from RunPod (Vellum 2.0)`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum 2.0 polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum Piel workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellumPiel") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-workflows-status?jobId=${runId}`);
        const data = await response.json();

        console.log("vellum piel status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from RunPod (Vellum Piel)`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum piel polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum Edad workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellumEdad") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-workflows-status?jobId=${runId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum edad polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum Makeup workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellumMakeup") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-workflows-status?jobId=${runId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum makeup polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum Pelo workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellumPelo") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-workflows-status?jobId=${runId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum pelo polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Vellum Pecas workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "vellumPecas") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/vellum-workflows-status?jobId=${runId}`);
        const data = await response.json();

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("vellum pecas polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for AI Talk status
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "aiTalk") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/ai-talk-status?runId=${runId}`);
        if (response.status === 401) {
          console.warn("AI Talk status polling: session expired");
          clearInterval(pollInterval);
          setIsLoading(false);
          setStatus("failed");
          setError("Tu sesión ha expirado. Recarga la página e inicia sesión de nuevo.");
          return;
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          console.warn("AI Talk status: unexpected response type", contentType);
          return;
        }

        const data = await response.json();
        console.log("AI Talk status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.videos && data.videos.length > 0) {
            setResultImages(data.videos);
            console.log(`Received ${data.videos.length} videos from RunPod`);
          } else if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} results from RunPod`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Workflow failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running") {
          setStatus("running");
        }
      } catch (error) {
        console.error("AI Talk polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Avatar workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "avatar") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/avatar-status?jobId=${runId}`);
        const data = await response.json();

        console.log("Avatar status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from RunPod (Avatar)`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Avatar generation failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running" || data.status === "queued") {
          setStatus("running");
        }
      } catch (error) {
        console.error("Avatar polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Poll for RunPod status (Poses workflow)
  useEffect(() => {
    if (!runId || status === "completed" || status === "failed" || activeTab !== "poses") {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/poses-status?jobId=${runId}`);
        const data = await response.json();

        console.log("Poses status data:", data);

        if (data.status === "completed") {
          setStatus("completed");
          if (data.images && data.images.length > 0) {
            setResultImages(data.images);
            console.log(`Received ${data.images.length} images from RunPod (Poses)`);
          }
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "failed") {
          setStatus("failed");
          setError(data.error || "Poses generation failed");
          clearInterval(pollInterval);
          setIsLoading(false);
        } else if (data.status === "running" || data.status === "queued") {
          setStatus("running");
        }
      } catch (error) {
        console.error("Poses polling error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [runId, status, activeTab]);

  // Save to history when run completes successfully
  useEffect(() => {
    if (status === "completed" && resultImages.length > 0 && runId) {
      addToHistory({
        runId,
        images: resultImages,
        workflowName: activeWorkflowName,
        parameters: lastSubmittedParams.current ?? undefined,
      });
    }
  }, [status, resultImages, runId, activeWorkflowName, addToHistory]);

  // Handle reuse parameters from gallery
  const handleReuseParameters = (parameters: Record<string, string | number>) => {
    // Switch to the correct tab based on workflow if needed
    // Set the parameters to be picked up by the form
    setReusedParameters(parameters);
  };

  // Handle "Poses" button from gallery - fetch image and auto-submit to poses
  const handleUsePoses = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();

      // Extract clean filename from URL (handle proxy URLs with query params)
      const urlObj = new URL(imageUrl, window.location.origin);
      const filename = urlObj.searchParams.get("filename")
        || urlObj.pathname.split("/").pop()
        || "image.png";

      const rawFile = new File([blob], filename, { type: blob.type || "image/png" });

      // Compress to match what ImageUpload does (max 2MB, 2048px, quality 0.85)
      const file = await compressImage(rawFile, 2, 2048, 0.85);

      // Switch to poses tab and reset generation states
      setActiveTab("poses");
      setIsLoading(false);
      setRunId(null);
      setStatus(null);
      setResultImages([]);
      setError(undefined);

      // Scroll to top so the Poses tab is fully visible
      window.scrollTo(0, 0);

      // Set the pending image so PosesForm picks it up and auto-submits
      setPendingPosesImage(file);
    } catch (error) {
      console.error("Failed to use image for poses:", error);
      alert("No se pudo cargar la imagen para generar poses.");
    }
  };

  const [reusedParameters, setReusedParameters] = useState<Record<string, string | number> | null>(null);
  const [pendingPosesImage, setPendingPosesImage] = useState<File | null>(null);

  const handleSubmit = async (inputs: Record<string, File | string | number>) => {
    setIsLoading(true);
    setStatus("queued");
    setError(undefined);
    setResultImages([]);

    // Capture text/number parameters (skip File objects)
    const params: Record<string, string | number> = {};
    Object.entries(inputs).forEach(([key, value]) => {
      if (!(value instanceof File)) {
        params[key] = value;
      }
    });
    lastSubmittedParams.current = params;

    try {
      const formData = new FormData();
      // Add all inputs (files, text values, and numbers)
      Object.entries(inputs).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else {
          formData.append(key, String(value));
        }
      });

      // Use different API endpoints based on the active tab
      const apiEndpoint = activeTab === "fashion"
        ? "/api/run-workflow"
        : activeTab === "vellum"
          ? "/api/run-vellum"
          : activeTab === "vellum20"
            ? "/api/run-vellum20"
            : activeTab === "vellumPiel"
              ? "/api/run-vellum-piel"
              : activeTab === "vellumEdad"
                ? "/api/run-vellum-edad"
                : activeTab === "vellumMakeup"
                  ? "/api/run-vellum-makeup"
                  : activeTab === "vellumPelo"
                    ? "/api/run-vellum-pelo"
                    : activeTab === "vellumPecas"
                    ? "/api/run-vellum-pecas"
                    : activeTab === "aiTalk"
                      ? "/api/run-ai-talk"
                      : activeTab === "poses"
                        ? "/api/run-poses"
                        : "/api/run-avatar";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run workflow");
      }

      // ComfyDeploy returns runId, RunPod returns jobId, local ComfyUI returns promptId
      const id = data.runId || data.jobId || data.promptId;
      setRunId(id);
      setStatus("running");
    } catch (error) {
      console.error("Submission error:", error);
      setStatus("failed");
      setError(sanitizeErrorMessage(error instanceof Error ? error.message : null));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))]">
      <Header />

      <main className="container mx-auto py-8">
        <div className="max-w-7xl mx-auto">
          {/* Tabs Section */}
          <div className="mb-6 animate-fade-in">
            <WorkflowTabs activeTab={activeTab} onTabChange={handleTabChange} />
          </div>

          {/* Hero Section */}
          <div className="mb-6 animate-fade-in">
            <h2 className="font-work-sans text-md md:text-xl font-bold mb-2 bg-gradient-to-r from-brand-pink via-brand-pink-light to-brand-pink bg-clip-text text-transparent tracking-tighter">
              {activeWorkflowName}
            </h2>
            <p className="text-xs text-[rgb(var(--muted-foreground))] tracking-tight">
              {activeWorkflowDescription}
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
              <h3 className="text-sm font-semibold mb-3 text-gray-400">
                {activeTab === "fashion"
                  ? "Upload Images"
                  : activeTab === "vellum" || activeTab === "vellum20"
                    ? "Image Upscaling"
                    : activeTab === "vellumPiel"
                      ? "Skin Enhancement"
                      : activeTab === "vellumEdad"
                        ? "Age Transformation"
                        : activeTab === "vellumMakeup"
                          ? "Makeup Transfer"
                          : activeTab === "vellumPelo"
                            ? "Hair Transfer"
                            : activeTab === "vellumPecas"
                            ? "Freckle Generation"
                            : activeTab === "aiTalk"
                              ? "Generate Talking Video"
                              : activeTab === "poses"
                                ? "Upload Portrait"
                                : "Character Settings"}
              </h3>
              {activeTab === "avatar" ? (
                <AvatarForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  reusedParameters={reusedParameters}
                  onParametersApplied={() => setReusedParameters(null)}
                />
              ) : activeTab === "poses" ? (
                <PosesForm
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  preloadedImage={pendingPosesImage}
                  onPreloadedImageApplied={() => setPendingPosesImage(null)}
                />
              ) : workflow ? (
                <WorkflowForm
                  workflow={workflow}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  reusedParameters={reusedParameters}
                  onParametersApplied={() => setReusedParameters(null)}
                />
              ) : null}
            </div>

            {/* Result Section */}
            <div className="animate-slide-up sticky top-4" style={{ animationDelay: "100ms" }}>
              {status ? (
                <ResultDisplay
                  status={status}
                  images={resultImages}
                  error={error}
                  onGeneratePoses={activeTab === "avatar" ? handleUsePoses : undefined}
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
                  <Gallery
                    history={history}
                    onClearHistory={clearHistory}
                    onReuseParameters={handleReuseParameters}
                    onUsePoses={handleUsePoses}
                  />
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              COPYRIGHT 2026 © THE CLUELESS AIGENCY S.L.
              <br />
              <span className="text-brand-pink">hello@theclueless.ai</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
