"use client";

import { cn } from "@/lib/utils";

interface ButtonGroupInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}

export function ButtonGroupInput({
  label,
  description,
  value,
  onChange,
  options,
  required = false,
}: ButtonGroupInputProps) {
  return (
    <div className="w-full">
      <label className="block text-xs font-medium mb-2 text-[rgb(var(--muted-foreground))]">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>

      {description && (
        <p className="text-xs text-[rgb(var(--muted-foreground))] mb-2">
          {description}
        </p>
      )}

      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "flex-1 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
              "border-2 focus:outline-none focus:ring-2 focus:ring-brand-pink/50",
              value === option
                ? "bg-brand-pink border-brand-pink text-gray-900 shadow-lg shadow-brand-pink/30"
                : "bg-[rgb(var(--card))] border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:border-brand-pink/50 hover:bg-brand-pink/10"
            )}
          >
            X{option}
          </button>
        ))}
      </div>
    </div>
  );
}
