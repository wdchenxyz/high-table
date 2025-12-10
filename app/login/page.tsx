"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (res.ok) {
          router.push("/");
          router.refresh();
        } else {
          const data = await res.json();
          setError(data.error || "Invalid credentials");
        }
      } catch {
        setError("An error occurred. Please try again.");
      }
    });
  };

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0b]">
      {/* Ambient background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial gradient glow */}
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-900/20 via-transparent to-transparent blur-3xl" />
        <div className="absolute right-0 top-0 h-[600px] w-[600px] rounded-full bg-gradient-to-l from-amber-800/10 via-transparent to-transparent blur-3xl" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Main content */}
      <main className="relative z-10 w-full max-w-md px-6">
        {/* Logo and title */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent shadow-lg shadow-amber-500/5">
            <Shield className="h-8 w-8 text-amber-400" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl font-light tracking-tight text-white">
            High Table
          </h1>
          <p className="mt-3 text-sm tracking-wide text-zinc-500">
            Enter your credentials to proceed
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username field */}
          <div className="group relative">
            <label
              htmlFor="username"
              className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-zinc-900 focus:ring-2 focus:ring-amber-500/20"
              placeholder="Enter username"
            />
          </div>

          {/* Password field */}
          <div className="group relative">
            <label
              htmlFor="password"
              className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 pr-12 text-white placeholder-zinc-600 outline-none transition-all duration-200 focus:border-amber-500/50 focus:bg-zinc-900 focus:ring-2 focus:ring-amber-500/20"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isPending}
            className="group relative mt-8 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 font-medium text-black transition-all duration-300 hover:from-amber-500 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Enter
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </>
              )}
            </span>
            {/* Button shine effect */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </button>
        </form>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-zinc-600">
          Multi-AI Deliberation Platform
        </p>
      </main>

      {/* Decorative corner elements */}
      <div className="pointer-events-none absolute left-8 top-8 h-24 w-24 border-l border-t border-zinc-800/50" />
      <div className="pointer-events-none absolute bottom-8 right-8 h-24 w-24 border-b border-r border-zinc-800/50" />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-page main {
          animation: fadeIn 0.6s ease-out;
        }

        .login-page main > * {
          animation: fadeIn 0.6s ease-out backwards;
        }

        .login-page main > *:nth-child(1) { animation-delay: 0.1s; }
        .login-page main > *:nth-child(2) { animation-delay: 0.2s; }
        .login-page main > *:nth-child(3) { animation-delay: 0.3s; }
      `}</style>
    </div>
  );
}
