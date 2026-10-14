import { Link } from "@/i18n/navigation";
import type { Metadata } from "next";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-primary">WatchStash</h1>
      <p className="max-w-xl text-sm text-muted">
        Track what you watch, discover what to watch next, and follow friends
        across movies, series, and anime.
      </p>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border-hover"
        >
          Sign in
        </Link>
        <Link
          href="/app"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black"
        >
          Open app
        </Link>
      </div>
    </main>
  );
}