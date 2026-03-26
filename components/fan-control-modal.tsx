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
  const [currentTemp, setCurrentTemp] = useState<number | null>(null);
  const [fanCount, setFanCount] = useState<number | null>(null);
  const [aioRpm, setAioRpm] = useState<number | null>(null);
  const [aioTemp, setAioTemp] = useState<number | null>(null);
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
      setCurrentTemp(data.averageTemp ?? null);
      setFanCount(data.fanCount ?? null);
      setAioRpm(data.aioRpm ?? null);
      setAioTemp(data.aioTemp ?? null);
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

            {/* Status row — Fans */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
              <span className="text-[10px] font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wide w-full">
                Ventiladores{fanCount !== null && !loading ? ` · ${fanCount}` : ""}
              </span>
              {/* Temperature */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Temp:</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md border",
                  "bg-[rgb(var(--background))]",
                  loading
                    ? "text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]"
                    : currentTemp === null
                    ? "text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]"
                    : currentTemp < 60
                    ? "text-green-400 border-green-400/30"
                    : currentTemp < 80
                    ? "text-orange-400 border-orange-400/30"
                    : "text-red-400 border-red-400/30"
                )}>
                  {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : currentTemp !== null ? `${currentTemp} °C` : "—"}
                </span>
              </div>
              {/* RPM */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgb(var(--muted-foreground))]">RPM:</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
                  loading ? "text-[rgb(var(--muted-foreground))]" : "text-brand-pink"
                )}>
                  {loading ? "…" : currentRpm !== null ? currentRpm : "—"}
                </span>
              </div>
            </div>

            {/* Status row — AIO */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
              <span className="text-[10px] font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wide w-full">
                AIO · H150i LCD
              </span>
              {/* AIO Temp (coolant) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Líquido:</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md border",
                  "bg-[rgb(var(--background))]",
                  loading
                    ? "text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]"
                    : aioTemp === null
                    ? "text-[rgb(var(--muted-foreground))] border-[rgb(var(--border))]"
                    : aioTemp < 35
                    ? "text-green-400 border-green-400/30"
                    : aioTemp < 45
                    ? "text-orange-400 border-orange-400/30"
                    : "text-red-400 border-red-400/30"
                )}>
                  {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : aioTemp !== null ? `${aioTemp} °C` : "—"}
                </span>
              </div>
              {/* AIO RPM (pump) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[rgb(var(--muted-foreground))]">Bomba:</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-md",
                  "bg-[rgb(var(--background))] border border-[rgb(var(--border))]",
                  loading ? "text-[rgb(var(--muted-foreground))]" : "text-blue-400"
                )}>
                  {loading ? "…" : aioRpm !== null ? `${aioRpm} rpm` : "—"}
                </span>
              </div>
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
