"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

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
    <div className="login-page relative flex min-h-screen items-center justify-center bg-[#0a0a0b]">

      {/* Main content */}
      <main className="w-full max-w-md px-6">
        {/* Logo and title */}
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/50">
            <Crown className="h-8 w-8 text-zinc-300" strokeWidth={1.5} />
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
            className="group relative mt-8 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-zinc-800 font-medium text-zinc-100 transition-all duration-300 hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
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
