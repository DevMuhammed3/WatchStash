"use client";

import { useEffect, useState } from "react";
import { Clapperboard, Loader2 } from "lucide-react";
import { setTokens } from "@/lib/auth";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const errorParam = params.get("error");

    if (errorParam) {
      setError("Sign-in was not completed. Please try again.");
      return;
    }

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      window.location.replace("/");
      return;
    }

    setError("Sign-in failed. Please try again.");
  }, []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-40 left-0 right-0 mx-auto h-[420px] w-[640px] max-w-full glow-amber blur-3xl" />
      </div>

      <div className="animate-fade-up relative flex w-full max-w-sm flex-col items-center text-center">
        <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent shadow-[0_0_24px_rgba(245,158,11,0.25)]">
          <Clapperboard className="h-5 w-5" />
        </span>

        {error ? (
          <>
            <p className="text-sm text-muted">{error}</p>
            <a
              href="/login"
              className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Back to sign in
            </a>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-sm text-muted">Signing you in…</p>
          </div>
        )}
      </div>
    </main>
  );
}
