"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Loader2, Volume2, Square } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

interface VoiceSelectInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function VoiceSelectInput({
  label,
  description,
  value,
  onChange,
  required = false,
}: VoiceSelectInputProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoices();
  }, []);

  const fetchVoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/elevenlabs-voices");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch voices");
      }

      const data = await response.json();
      setVoices(data.voices);

      // If no value is selected and we have voices, select the first one
      if (!value && data.voices.length > 0) {
        onChange(data.voices[0].voice_id);
      }
    } catch (err) {
      console.error("Error fetching voices:", err);
      setError(err instanceof Error ? err.message : "Failed to load voices");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviewVoice = (e: React.MouseEvent, voice: Voice) => {
    e.preventDefault();
    e.stopPropagation();

    if (!voice.preview_url) return;

    // If already playing this voice, stop it
    if (playingVoiceId === voice.voice_id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayingVoiceId(null);
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Play new audio
    audioRef.current = new Audio(voice.preview_url);
    audioRef.current.play();
    setPlayingVoiceId(voice.voice_id);

    audioRef.current.onended = () => {
      setPlayingVoiceId(null);
    };
  };

  const selectedVoice = voices.find((v) => v.voice_id === value);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      premade: "Pre-made",
      cloned: "Cloned",
      generated: "Generated",
      professional: "Professional",
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          {label}
          {required && <span className="text-brand-pink ml-1">*</span>}
        </label>
        <div className="flex items-center justify-center py-3 px-3 bg-[rgb(var(--input))] border border-[rgb(var(--border-input))] rounded-md">
          <Loader2 className="w-4 h-4 animate-spin text-[rgb(var(--muted-foreground))]" />
          <span className="ml-2 text-xs text-[rgb(var(--muted-foreground))]">
            Loading voices...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-1">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          {label}
          {required && <span className="text-brand-pink ml-1">*</span>}
        </label>
        <div className="py-3 px-3 bg-red-500/10 border border-red-500/30 rounded-md">
          <p className="text-xs text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchVoices}
            className="mt-2 text-xs text-brand-pink hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-[rgb(var(--muted-foreground))]">
          {description}
        </p>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            "w-full px-3 py-2 pr-8",
            "bg-[rgb(var(--input))] border border-[rgb(var(--border-input))] rounded-md",
            "text-[rgb(var(--muted-foreground))] text-xs",
            "focus:outline-none focus:ring-1 focus:ring-brand-pink focus:border-transparent",
            "transition-all duration-200",
            "appearance-none cursor-pointer",
            "hover:border-brand-pink/50"
          )}
        >
          {voices.map((voice) => (
            <option
              key={voice.voice_id}
              value={voice.voice_id}
              className="bg-[rgb(var(--secondary))] text-[rgb(var(--foreground))]"
            >
              {voice.name} ({getCategoryLabel(voice.category)})
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))] pointer-events-none"
        />
      </div>

      {/* Preview button for selected voice */}
      {selectedVoice?.preview_url && (
        <button
          type="button"
          onClick={(e) => handlePreviewVoice(e, selectedVoice)}
          className={cn(
            "flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded text-xs",
            "bg-[rgb(var(--secondary))] hover:bg-[rgb(var(--secondary))]/80",
            "text-[rgb(var(--muted-foreground))] hover:text-brand-pink",
            "transition-colors duration-200"
          )}
        >
          {playingVoiceId === selectedVoice.voice_id ? (
            <>
              <Square className="w-3 h-3 fill-current" />
              Stop Preview
            </>
          ) : (
            <>
              <Volume2 className="w-3 h-3" />
              Preview Voice
            </>
          )}
        </button>
      )}
    </div>
  );
}
