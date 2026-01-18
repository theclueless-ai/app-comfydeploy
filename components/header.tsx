"use client";

import { ThemeToggle } from "./theme-toggle";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-pink flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h1 className="text-xl font-bold">theclueless</h1>
              <p className="text-xs text-[rgb(var(--muted-foreground))]">
                Workflow Studio
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
