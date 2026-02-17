"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function StellaLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const result = await login(email, password);

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Login failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* Placeholder for user's local image */}
        <div className="absolute inset-0 bg-neutral-900">
          <Image
            src="/stella-login.jpg"
            alt="Stella"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Stella logo overlay - top left */}
        <div className="absolute top-8 left-8 z-10">
          <span className="text-white text-8xl font-light tracking-widest">
            stella<sup className="text-lg align-end">®</sup>
          </span>
        </div>

        {/* Copyright overlay - bottom left */}
        <div className="absolute bottom-8 left-8 z-10">
          <p className="text-white/60 text-xs tracking-wide">
            © Stella 2026. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col min-h-screen bg-black px-8 sm:px-12 lg:px-20 xl:px-28">
        {/* Top bar */}
        <div className="flex items-center justify-between pt-8">
          {/* Mobile logo */}
          <span className="lg:hidden text-white text-2xl font-light tracking-widest">
            stella<sup className="text-xs align-super">®</sup>
          </span>
          <div className="flex-1" />
          <a
            href="#"
            className="text-white/70 text-sm tracking-wide hover:text-white transition-colors"
          >
            Crear cuenta
          </a>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex flex-col justify-center max-w-lg w-full mx-auto">
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight mb-12">
            Iniciar sesión
          </h1>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email and Password - side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Email Field */}
              <div className="space-y-3">
                <label
                  htmlFor="stella-email"
                  className="text-white/50 text-xs uppercase tracking-widest"
                >
                  Email
                </label>
                <input
                  id="stella-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@gmail.com"
                  disabled={isLoading}
                  className="w-full bg-transparent border-b border-white/20 pb-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/60 transition-colors disabled:opacity-50"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-3">
                <label
                  htmlFor="stella-password"
                  className="text-white/50 text-xs uppercase tracking-widest"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="stella-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password123"
                    disabled={isLoading}
                    className="w-full bg-transparent border-b border-white/20 pb-3 pr-10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/60 transition-colors disabled:opacity-50"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 bottom-3 text-white/40 hover:text-white/70 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-white/30 rounded-sm peer-checked:bg-white peer-checked:border-white transition-all" />
                  <svg
                    className="absolute top-0.5 left-0.5 w-3 h-3 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <span className="text-white/50 text-xs tracking-wide group-hover:text-white/70 transition-colors">
                  Recuérdame
                </span>
              </label>

              <a
                href="#"
                className="text-white/50 text-xs tracking-wide hover:text-white/70 transition-colors"
              >
                ¿Olvidaste algo?
              </a>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-36 h-36 rounded-full bg-white text-black text-xs uppercase tracking-[0.2em] font-medium hover:bg-white/90 active:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                ) : (
                  <span className="leading-tight text-center">
                    INICIAR
                    <br />
                    SESIÓN
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
