"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { X, Eye } from "lucide-react";
import { BuilderCategory } from "@/lib/types";

interface BuilderInputProps {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  categories: BuilderCategory[];
  required?: boolean;
}

export function BuilderInput({
  label,
  description,
  value,
  onChange,
  categories,
  required = false,
}: BuilderInputProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const initializedRef = useRef(false);

  // Build the concatenated result
  const buildResult = useCallback((): string => {
    const selected = Object.values(selectedOptions).filter(Boolean);
    return selected.join(", ");
  }, [selectedOptions]);

  // Initialize from value if exists (only once on mount)
  useEffect(() => {
    if (!initializedRef.current && value) {
      // Parse existing value (if needed for editing)
      const parts = value.split(", ");
      const newSelected: Record<string, string> = {};

      categories.forEach((category) => {
        category.options.forEach((option) => {
          if (parts.includes(option)) {
            newSelected[category.id] = option;
          }
        });
      });

      if (Object.keys(newSelected).length > 0) {
        setSelectedOptions(newSelected);
      }
      initializedRef.current = true;
    }
  }, [value, categories]);

  // Update parent component when selections change
  useEffect(() => {
    const result = buildResult();
    if (result !== value) {
      onChange(result);
    }
  }, [buildResult, value, onChange]);

  // Check if an option is disabled due to exclusivity rules
  const isOptionDisabled = (categoryId: string, option: string): boolean => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || !category.exclusiveWith) return false;

    // Check if any exclusive category has a selection
    for (const exclusiveCategoryId of category.exclusiveWith) {
      if (selectedOptions[exclusiveCategoryId]) {
        return true;
      }
    }

    return false;
  };

  // Handle option selection
  const handleOptionToggle = (categoryId: string, option: string) => {
    setSelectedOptions((prev) => {
      const current = prev[categoryId];

      // If clicking the same option, deselect it
      if (current === option) {
        const newState = { ...prev };
        delete newState[categoryId];
        return newState;
      }

      // Otherwise, select it (replace previous selection in same category)
      return {
        ...prev,
        [categoryId]: option,
      };
    });
  };

  // Get the number of selected options
  const selectedCount = Object.keys(selectedOptions).length;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400">
            {label}
            {required && <span className="text-brand-pink ml-1">*</span>}
          </label>
        </div>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
              "bg-brand-pink/10 text-brand-pink hover:bg-brand-pink/20"
            )}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        )}
      </div>

      {/* Preview Box */}
      {showPreview && selectedCount > 0 && (
        <div className="bg-gray-800/50 border border-brand-pink/30 rounded-md p-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-brand-pink">Result:</span>
            <p className="text-xs text-gray-300 flex-1">{buildResult()}</p>
          </div>
        </div>
      )}

      {/* Categories and Options */}
      <div className="space-y-2 bg-gray-800/30 border border-gray-700 rounded-md p-3">
        {categories.map((category) => {
          const isCategoryDisabled = isOptionDisabled(category.id, "");
          const hasSelection = !!selectedOptions[category.id];

          return (
            <div key={category.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className={cn(
                  "text-xs font-medium",
                  isCategoryDisabled ? "text-gray-500" : "text-gray-400"
                )}>
                  {category.label}
                  {category.required && <span className="text-brand-pink ml-1">*</span>}
                </h4>
                {hasSelection && (
                  <span className="text-xs text-brand-pink font-medium">
                    1 selected
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {category.options.map((option) => {
                  const isSelected = selectedOptions[category.id] === option;
                  const isDisabled = isCategoryDisabled && !isSelected;

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleOptionToggle(category.id, option)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                        "border flex items-center gap-1.5",
                        isSelected
                          ? "bg-brand-pink/20 border-brand-pink text-brand-pink"
                          : isDisabled
                          ? "bg-gray-800/30 border-gray-700 text-gray-600 cursor-not-allowed"
                          : "bg-gray-800/50 border-gray-600 text-gray-300 hover:border-brand-pink/50 hover:bg-gray-800/70"
                      )}
                    >
                      <span className="line-clamp-2 text-left">{option}</span>
                      {isSelected && (
                        <X className="w-3 h-3 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isCategoryDisabled && (
                <p className="text-xs text-gray-500 italic">
                  Disabled due to incompatible selection
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-medium text-brand-pink">{selectedCount}</span>
          <span>element{selectedCount !== 1 ? "s" : ""} selected</span>
        </div>
      )}
    </div>
  );
}
