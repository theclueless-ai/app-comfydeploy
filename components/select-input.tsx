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
      <label className="block text-xs font-medium text-gray-400">
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
            "bg-white border border-gray-700 rounded-md",
            "text-gray-400 text-xs",
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
              className="bg-gray-800 text-gray-200"
            >
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  );
}
