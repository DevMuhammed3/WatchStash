import { Link } from "@/i18n/navigation";
import { Button } from "@watchstash/ui";

export function NotFoundPanel() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">
        404
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-primary">
        Page not found
      </h1>
      <p className="max-w-md text-sm text-muted">
        The page you requested does not exist or may have moved.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black">
          Go home
        </Link>
        <Link
          href="/app"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-primary transition-colors hover:border-border-hover"
        >
          Open app
        </Link>
      </div>
    </main>
  );
}