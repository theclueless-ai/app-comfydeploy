"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex h-10 w-20 items-center rounded-full transition-colors",
        "bg-[rgb(var(--secondary))] hover:bg-[rgb(var(--accent))]",
        "border border-[rgb(var(--border))]"
      )}
      aria-label="Toggle theme"
    >
      <span
        className={cn(
          "absolute inline-flex h-8 w-8 items-center justify-center rounded-full",
          "bg-brand-pink shadow-lg transition-transform duration-300",
          theme === "dark" ? "translate-x-10" : "translate-x-1"
        )}
      >
        {theme === "light" ? (
          <Sun className="h-4 w-4 text-gray-900" />
        ) : (
          <Moon className="h-4 w-4 text-gray-900" />
        )}
      </span>
    </button>
  );
}
