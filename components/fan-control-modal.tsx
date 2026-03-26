"use client";

import { useState, useEffect, useCallback } from "react";
import { Wind, X, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SliderInput } from "./slider-input";

export function FanControlModal() {
  const [open, setOpen] = useState(false);
  const [speed, setSpeed] = useState(50);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCurrentSpeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fan-control");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      // OpenLinkHub returns device info; try to extract a speed value if present.
      // The response shape varies by device, so we surface what we can.
      const extractedSpeed =
        data?.speed ??
        data?.Speed ??
        data?.devices?.[0]?.Channels?.[0]?.speed ??
        data?.devices?.[0]?.Channels?.[0]?.Speed ??
        null;
      if (typeof extractedSpeed === "number") {
        setCurrentSpeed(extractedSpeed);
        setSpeed(extractedSpeed);
      } else {
        setCurrentSpeed(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not reach OpenLinkHub on the local machine."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCurrentSpeed();
    }
  }, [open, fetchCurrentSpeed]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/fan-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 207) {
        throw new Error(data.error ?? `Error ${res.status}`);
      }
      setCurrentSpeed(speed);
      setSuccessMsg(`Fan speed set to ${speed}%`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply fan speed."
      );
    } finally {
      setApplying(false);
    }
  };

  // Zone helpers
  const getZoneLabel = (v: number) => {
    if (v < 30) return "Quiet / Minimum";
    if (v < 70) return "Normal";
    return "Performance";
  };
  const getZoneColor = (v: number) => {
    if (v < 30) return "text-orange-400";
    if (v < 70) return "text-green-400";
    return "text-blue-400";
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Fan Speed Control"
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
          "bg-[rgb(var(--card))] border border-[rgb(var(--border))]",
          "text-[rgb(var(--muted-foreground))] hover:text-brand-pink",
          "hover:border-brand-pink/40 transition-colors"
        )}
      >
        <Wind className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Fans</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl p-6 w-full max-w-sm shadow-2xl animate-slide-up mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-brand-pink" />
                <h2 className="text-sm font-semibold text-[rgb(var(--foreground))]">
                  Fan Speed Control
                </h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]",
                  "hover:bg-[rgb(var(--background))]"
                )}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current speed badge */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xs text-[rgb(var(--muted-foreground))]">
                Current speed:
              </span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
                  loading
                    ? "text-[rgb(var(--muted-foreground))]"
                    : "text-brand-pink"
                )}
              >
                {loading ? "Loading…" : currentSpeed !== null ? `${currentSpeed}%` : "—"}
              </span>
            </div>

            {/* Slider */}
            <SliderInput
              label="Target Speed"
              value={speed}
              onChange={setSpeed}
              min={20}
              max={100}
              step={5}
              suffix="%"
              decimals={0}
            />

            {/* Zone indicator */}
            <div className="mt-3 mb-1">
              <div className="flex h-2 rounded-full overflow-hidden">
                {/* Quiet zone: 20–29% → 9/80 = ~11% */}
                <div className="bg-orange-400/70" style={{ width: "11.25%" }} />
                {/* Normal zone: 30–69% → 40/80 = 50% */}
                <div className="bg-green-400/70" style={{ width: "50%" }} />
                {/* Performance zone: 70–100% → 31/80 = ~39% */}
                <div className="bg-blue-400/70" style={{ width: "38.75%" }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-[rgb(var(--muted-foreground))]">
                <span className="text-orange-400">Quiet</span>
                <span className="text-green-400">Normal</span>
                <span className="text-blue-400">Performance</span>
              </div>
            </div>

            {/* Zone label for current selection */}
            <p className={cn("text-xs font-medium mt-2", getZoneColor(speed))}>
              {getZoneLabel(speed)} — {speed}%
            </p>

            {/* Warning */}
            {speed < 30 && (
              <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-orange-400/10 border border-orange-400/20">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-400">
                  Below 30% is not recommended during AI workloads. Risk of
                  thermal throttling.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-green-400/10 border border-green-400/20">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <p className="text-xs text-green-400">{successMsg}</p>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleApply}
                disabled={applying}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-colors",
                  "bg-brand-pink text-gray-900",
                  "hover:bg-brand-pink-light disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {applying ? "Applying…" : "Apply"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                  "border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]",
                  "hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--foreground))]/30"
                )}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
