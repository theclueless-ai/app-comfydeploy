"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
}

export function MultiSelectInput({
  label,
  values,
  onChange,
  options,
}: MultiSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (option === "no distinctive features") {
      onChange(["no distinctive features"]);
      return;
    }
    const filtered = values.filter((v) => v !== "no distinctive features");
    if (filtered.includes(option)) {
      const next = filtered.filter((v) => v !== option);
      onChange(next.length === 0 ? ["no distinctive features"] : next);
    } else {
      onChange([...filtered, option]);
    }
  };

  const removeValue = (option: string) => {
    const next = values.filter((v) => v !== option);
    onChange(next.length === 0 ? ["no distinctive features"] : next);
  };

  const displayValues = values.filter((v) => v !== "no distinctive features");
  const hasNone = values.includes("no distinctive features") && displayValues.length === 0;

  return (
    <div className="space-y-1" ref={containerRef}>
      <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3 py-2 pr-8 text-left",
            "bg-[rgb(var(--input))] border border-[rgb(var(--border-input))] rounded-md",
            "text-[rgb(var(--muted-foreground))] text-xs",
            "focus:outline-none focus:ring-1 focus:ring-brand-pink focus:border-transparent",
            "transition-all duration-200",
            "cursor-pointer",
            "hover:border-brand-pink/50"
          )}
        >
          {hasNone ? (
            <span className="text-[rgb(var(--muted-foreground))]/60">No distinctive features</span>
          ) : displayValues.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {displayValues.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-brand-pink/20 text-brand-pink text-[10px]"
                >
                  {v}
                  <X
                    className="w-2.5 h-2.5 cursor-pointer hover:text-brand-pink-dark"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(v);
                    }}
                  />
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[rgb(var(--muted-foreground))]/60">Select features...</span>
          )}
        </button>
        <ChevronDown
          className={cn(
            "absolute right-2 top-2.5 w-4 h-4 text-[rgb(var(--muted-foreground))] pointer-events-none transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--secondary))] shadow-lg">
            {options.map((option) => {
              const isSelected = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleOption(option)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-xs transition-colors",
                    "hover:bg-brand-pink/10",
                    isSelected
                      ? "text-brand-pink font-medium bg-brand-pink/5"
                      : "text-[rgb(var(--foreground))]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center",
                        isSelected
                          ? "border-brand-pink bg-brand-pink"
                          : "border-[rgb(var(--border))]"
                      )}
                    >
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
