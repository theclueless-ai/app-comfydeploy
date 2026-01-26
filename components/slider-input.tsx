"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SliderInputProps {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
}

export function SliderInput({
  label,
  description,
  value,
  onChange,
  min = 0.1,
  max = 3,
  step = 0.1,
  required = false,
}: SliderInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  };

  // Calculate percentage for gradient
  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-medium text-[rgb(var(--muted-foreground))]">
          {label}
          {required && <span className="text-brand-pink ml-1">*</span>}
        </label>
        <span className="text-sm font-semibold text-brand-pink">
          {localValue.toFixed(1)}x
        </span>
      </div>

      {description && (
        <p className="text-xs text-[rgb(var(--muted-foreground))] mb-2">
          {description}
        </p>
      )}

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={handleChange}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-brand-pink/50",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-brand-pink",
            "[&::-webkit-slider-thumb]:shadow-lg",
            "[&::-webkit-slider-thumb]:shadow-brand-pink/30",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-all",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-webkit-slider-thumb]:hover:shadow-brand-pink/50",
            "[&::-moz-range-thumb]:w-5",
            "[&::-moz-range-thumb]:h-5",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-brand-pink",
            "[&::-moz-range-thumb]:border-none",
            "[&::-moz-range-thumb]:shadow-lg",
            "[&::-moz-range-thumb]:shadow-brand-pink/30",
            "[&::-moz-range-thumb]:cursor-pointer"
          )}
          style={{
            background: `linear-gradient(to right, #ff9ce0 0%, #ff9ce0 ${percentage}%, rgb(var(--border)) ${percentage}%, rgb(var(--border)) 100%)`,
          }}
        />

        {/* Min/Max labels */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[rgb(var(--muted-foreground))]">
            {min}x
          </span>
          <span className="text-xs text-[rgb(var(--muted-foreground))]">
            {max}x
          </span>
        </div>
      </div>
    </div>
  );
}
