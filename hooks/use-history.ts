"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getHistory as getLocalHistory,
  addToHistory as addToLocalHistory,
  clearHistory as clearLocalHistory,
  getTotalImagesCount,
  HistoryRun,
} from "@/lib/history";

interface UseHistoryOptions {
  isAuthenticated: boolean;
}

export function useHistory({ isAuthenticated }: UseHistoryOptions = { isAuthenticated: false }) {
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [totalImages, setTotalImages] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadLocalHistory = useCallback(() => {
    const currentHistory = getLocalHistory();
    setHistory(currentHistory);
    setTotalImages(getTotalImagesCount());
  }, []);

  const loadHistory = useCallback(async () => {
    if (isAuthenticated) {
      setIsLoadingHistory(true);
      try {
        const response = await fetch("/api/generations");
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history);
          const total = data.history.reduce(
            (sum: number, run: HistoryRun) => sum + run.images.length,
            0
          );
          setTotalImages(total);
        } else {
          loadLocalHistory();
        }
      } catch {
        loadLocalHistory();
      } finally {
        setIsLoadingHistory(false);
      }
    } else {
      loadLocalHistory();
    }
  }, [isAuthenticated, loadLocalHistory]);

  // Load history on mount and when auth state changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const addToHistory = useCallback(
    async (run: Omit<HistoryRun, "timestamp">) => {
      if (isAuthenticated) {
        try {
          await fetch("/api/generations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              runId: run.runId,
              workflowName: run.workflowName,
              parameters: run.parameters,
              images: run.images,
            }),
          });
          // Reload from API to get updated data (with S3 URLs if configured)
          await loadHistory();
        } catch (error) {
          console.error("Failed to save to API, falling back to localStorage:", error);
          addToLocalHistory(run);
          loadLocalHistory();
        }
      } else {
        addToLocalHistory(run);
        loadLocalHistory();
      }
    },
    [isAuthenticated, loadHistory, loadLocalHistory]
  );

  const clearHistory = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await fetch("/api/generations", { method: "DELETE" });
        setHistory([]);
        setTotalImages(0);
      } catch (error) {
        console.error("Failed to clear API history:", error);
      }
    } else {
      clearLocalHistory();
      setHistory([]);
      setTotalImages(0);
    }
  }, [isAuthenticated]);

  return {
    history,
    totalImages,
    isLoadingHistory,
    addToHistory,
    clearHistory,
    loadHistory,
  };
}
