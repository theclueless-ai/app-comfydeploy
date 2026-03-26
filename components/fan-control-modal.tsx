"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Wind, X, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FanProfile = "Quiet" | "Normal" | "Performance";

const PROFILES: Array<{
  id: FanProfile;
  label: string;
  sublabel: string;
  color: string;
  activeClass: string;
  borderClass: string;
}> = [
  {
    id: "Quiet",
    label: "Silencioso",
    sublabel: "Mín. ruido",
    color: "text-blue-400",
    activeClass: "bg-blue-400/15 border-blue-400",
    borderClass: "border-[rgb(var(--border))] hover:border-blue-400/50",
  },
  {
    id: "Normal",
    label: "Normal",
    sublabel: "Equilibrado",
    color: "text-green-400",
    activeClass: "bg-green-400/15 border-green-400",
    borderClass: "border-[rgb(var(--border))] hover:border-green-400/50",
  },
  {
    id: "Performance",
    label: "Rendimiento",
    sublabel: "Máx. flujo",
    color: "text-brand-pink",
    activeClass: "bg-brand-pink/15 border-brand-pink",
    borderClass: "border-[rgb(var(--border))] hover:border-brand-pink/50",
  },
];

export function FanControlModal() {
  const [open, setOpen] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<FanProfile | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<FanProfile>("Normal");
  const [currentRpm, setCurrentRpm] = useState<number | null>(null);
  const [fanCount, setFanCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchFanInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fan-control");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setCurrentRpm(data.averageRpm ?? null);
      setFanCount(data.fanCount ?? null);
      if (data.currentProfile) {
        setCurrentProfile(data.currentProfile as FanProfile);
        setSelectedProfile(data.currentProfile as FanProfile);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach OpenLinkHub.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchFanInfo();
  }, [open, fetchFanInfo]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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
        body: JSON.stringify({ profile: selectedProfile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setCurrentProfile(selectedProfile);
      setSuccessMsg(`Perfil "${selectedProfile}" aplicado`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setTimeout(() => fetchFanInfo(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply.");
    } finally {
      setApplying(false);
    }
  };

  const hasChanged = selectedProfile !== currentProfile;

  return (
    <>
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

      {open && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-[rgb(var(--card))] border border-[rgb(var(--border))] rounded-xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">

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
                className="p-1 rounded-md text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--background))] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgb(var(--muted-foreground))]">RPM actual:</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
                  loading ? "text-[rgb(var(--muted-foreground))]" : "text-brand-pink"
                )}>
                  {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : currentRpm !== null ? `${currentRpm} rpm` : "—"}
                </span>
              </div>
              {fanCount !== null && !loading && (
                <span className="text-xs text-[rgb(var(--muted-foreground))]">
                  · {fanCount} ventilador{fanCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>

            {/* Profile selector */}
            <div className="mb-2">
              <p className="text-xs text-[rgb(var(--muted-foreground))] mb-3">Perfil de velocidad</p>
              <div className="grid grid-cols-3 gap-2">
                {PROFILES.map((p) => {
                  const isActive = selectedProfile === p.id;
                  const isCurrent = currentProfile === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfile(p.id)}
                      disabled={applying}
                      className={cn(
                        "flex flex-col items-center gap-1 px-2 py-3 rounded-lg border text-center transition-all",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isActive ? p.activeClass : p.borderClass
                      )}
                    >
                      <span className={cn("text-xs font-semibold", isActive ? p.color : "text-[rgb(var(--muted-foreground))]")}>
                        {p.label}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--muted-foreground))]">
                        {p.sublabel}
                      </span>
                      {isCurrent && (
                        <span className={cn("text-[9px] font-medium", p.color)}>activo</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

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

            {/* Footer */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleApply}
                disabled={applying || !hasChanged}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors",
                  "bg-brand-pink text-gray-900",
                  "hover:bg-brand-pink-light disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {applying && <Loader2 className="w-3 h-3 animate-spin" />}
                {applying ? "Aplicando…" : "Aplicar"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                  "border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))]",
                  "hover:text-[rgb(var(--foreground))] hover:border-[rgb(var(--foreground))]/30"
                )}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
