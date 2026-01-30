"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { Loader2, Lock, User } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--background))] flex flex-col">
      {/* Header */}
      <header className="border-b border-[rgb(var(--border))] bg-[rgb(var(--background))]/80 backdrop-blur-sm">
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
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-md rounded-lg border p-8 animate-fade-in",
            "bg-[rgb(var(--card))] border-[rgb(var(--border))]",
            "shadow-lg"
          )}
        >
          {/* Logo/Icon */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-brand-pink/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-brand-pink" />
            </div>
            <h1 className="font-work-sans text-xl md:text-2xl font-bold bg-gradient-to-r from-brand-pink via-brand-pink-light to-brand-pink bg-clip-text text-transparent tracking-tighter">
              Welcome Back
            </h1>
            <p className="text-xs text-[rgb(var(--muted-foreground))] mt-2 tracking-tight">
              Sign in to access AI Fashion Commerce
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-xs font-medium text-[rgb(var(--muted-foreground))]"
              >
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={isLoading}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-lg text-sm",
                    "bg-[rgb(var(--input))] border border-[rgb(var(--border))]",
                    "text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]/50",
                    "focus:outline-none focus:ring-2 focus:ring-brand-pink/50 focus:border-brand-pink",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-xs font-medium text-[rgb(var(--muted-foreground))]"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgb(var(--muted-foreground))]" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  className={cn(
                    "w-full pl-10 pr-4 py-3 rounded-lg text-sm",
                    "bg-[rgb(var(--input))] border border-[rgb(var(--border))]",
                    "text-[rgb(var(--foreground))] placeholder:text-[rgb(var(--muted-foreground))]/50",
                    "focus:outline-none focus:ring-2 focus:ring-brand-pink/50 focus:border-brand-pink",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200"
                  )}
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium text-sm",
                "bg-brand-pink text-gray-900",
                "hover:bg-brand-pink-light active:bg-brand-pink-dark",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "shadow-lg shadow-brand-pink/20 hover:shadow-brand-pink/30",
                "transition-all duration-200",
                "flex items-center justify-center gap-2"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              Contact administrator for access
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center">
        <p className="text-xs text-[rgb(var(--muted-foreground))]">
          COPYRIGHT 2026 © THE CLUELESS AIGENCY S.L.
          <br />
          <span className="text-brand-pink">hello@theclueless.ai</span>
        </p>
      </footer>
    </div>
  );
}
