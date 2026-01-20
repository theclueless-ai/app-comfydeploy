"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
}

export function SelectInput({
  label,
  description,
  value,
  onChange,
  options,
  required = false,
}: SelectInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
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
          {options.map((option) => (
            <option
              key={option}
              value={option}
              className="bg-[rgb(var(--secondary))] text-[rgb(var(--foreground))]"
            >
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))] pointer-events-none"
        />
      </div>
    </div>
  );
}
