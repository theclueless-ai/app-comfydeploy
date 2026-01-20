// Types for history management
export interface HistoryImage {
  url: string;
  filename: string;
}

export interface HistoryRun {
  runId: string;
  timestamp: number; // Unix timestamp
  images: HistoryImage[];
  workflowName?: string;
}

const HISTORY_KEY = "comfydeploy_history";
const MAX_HISTORY_ITEMS = 50; // Limit to prevent localStorage from getting too large

// Get all history from localStorage
export function getHistory(): HistoryRun[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as HistoryRun[];
    // Sort by timestamp, newest first
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

// Add a new run to history
export function addToHistory(run: Omit<HistoryRun, "timestamp">): void {
  if (typeof window === "undefined") return;

  try {
    const history = getHistory();

    // Check if run already exists (avoid duplicates)
    const existingIndex = history.findIndex((r) => r.runId === run.runId);
    if (existingIndex !== -1) {
      // Update existing run
      history[existingIndex] = {
        ...run,
        timestamp: Date.now(),
      };
    } else {
      // Add new run
      const newRun: HistoryRun = {
        ...run,
        timestamp: Date.now(),
      };
      history.unshift(newRun);
    }

    // Limit history size
    const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(limitedHistory));
  } catch (error) {
    console.error("Failed to save to history:", error);
  }
}

// Clear all history
export function clearHistory(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
  }
}

// Get total number of images in history
export function getTotalImagesCount(): number {
  const history = getHistory();
  return history.reduce((total, run) => total + run.images.length, 0);
}

// Format timestamp for display
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than 1 minute
  if (diff < 60 * 1000) {
    return "Just now";
  }

  // Less than 1 hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  // Less than 24 hours
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  // Less than 7 days
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }

  // Format as date
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}
