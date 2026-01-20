"use client";

import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./theme-provider";
import Image from "next/image";

export function Header() {
  const { theme } = useTheme();

  return (
    <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src={theme === "light" ? "/theclueless-logo-black.png" : "/theclueless-logo-white.png"}
              alt="Theclueless Logo"
              width={150}
              height={50}
              className="h-auto"
              priority
            />
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
