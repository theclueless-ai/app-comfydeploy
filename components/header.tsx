"use client";

import { ThemeToggle } from "./theme-toggle";
import { useTheme } from "./theme-provider";
import { useAuth } from "./auth-provider";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function Header() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Image
              src={theme === "light" ? "/theclueless-logo-black.png" : "/theclueless-logo-white.png"}
              alt="Theclueless Logo"
              width={150}
              height={50}
              className="h-auto"
              priority
            />
            <p className="text-[#ff9ce0] text-2xl tracking-[-0.3em]">{'//'}</p>
            <Image
              src={theme === "light" ? "/troop.jpeg" : "/Troop-white.png"}
              alt="Troop Logo"
              width={80}
              height={50}
              className="h-auto"
              priority
            />
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
                  <User className="w-3.5 h-3.5 text-brand-pink" />
                  <span className="text-xs text-[rgb(var(--muted-foreground))]">
                    {user.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs",
                    "bg-red-500/10 text-red-500 border border-red-500/20",
                    "hover:bg-red-500/20 transition-colors"
                  )}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
