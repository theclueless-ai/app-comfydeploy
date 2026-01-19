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
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-200">
        {label}
        {required && <span className="text-brand-pink ml-1">*</span>}
      </label>
      {description && (
        <p className="text-sm text-gray-400">{description}</p>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className={cn(
            "w-full px-4 py-3 pr-10",
            "bg-gray-800/50 border border-gray-700 rounded-lg",
            "text-gray-200 text-sm",
            "focus:outline-none focus:ring-2 focus:ring-brand-pink focus:border-transparent",
            "transition-all duration-200",
            "appearance-none cursor-pointer",
            "hover:bg-gray-800/70"
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
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  );
}
