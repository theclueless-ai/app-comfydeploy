"use client";

import { useState, useEffect } from "react";
import {
  getHistory,
  addToHistory as addToHistoryUtil,
  clearHistory as clearHistoryUtil,
  getTotalImagesCount,
  HistoryRun,
} from "@/lib/history";

export function useHistory() {
  const [history, setHistory] = useState<HistoryRun[]>([]);
  const [totalImages, setTotalImages] = useState(0);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const currentHistory = getHistory();
    setHistory(currentHistory);
    setTotalImages(getTotalImagesCount());
  };

  const addToHistory = (run: Omit<HistoryRun, "timestamp">) => {
    addToHistoryUtil(run);
    loadHistory(); // Reload to update state
  };

  const clearHistory = () => {
    clearHistoryUtil();
    setHistory([]);
    setTotalImages(0);
  };

  return {
    history,
    totalImages,
    addToHistory,
    clearHistory,
    loadHistory,
  };
}
