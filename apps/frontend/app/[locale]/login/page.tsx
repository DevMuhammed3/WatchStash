"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clapperboard, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL, oauthAuthorizeUrl } from "@/lib/auth";
import { GoogleIcon, GitHubIcon, FacebookIcon, XIcon } from "@/components/brand-icons";
import type { OAuthProvider, UserProfile } from "@watchstash/types";

const PROVIDERS: Array<{
  id: OAuthProvider;
  label: string;
  icon: typeof GitHubIcon;
  comingSoon?: boolean;
}> = [
  { id: "google", label: "Continue with Google", icon: GoogleIcon },
  { id: "github", label: "Continue with GitHub", icon: GitHubIcon },
  { id: "facebook", label: "Continue with Facebook", icon: FacebookIcon, comingSoon: true },
  { id: "twitter", label: "Continue with X", icon: XIcon, comingSoon: true },
];

type Mode = "signin" | "register";

const inputClass =
  "w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-primary transition-all duration-200 placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

const labelClass = "mb-1 block text-xs font-medium text-secondary";

export default function LoginPage() {
  const { status, completeAuth } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isRegister = mode === "register";
      const res = await fetch(`${API_BASE_URL}/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister
            ? { username, displayName, email, password }
            : { identifier, password },
        ),
      });

      const data = (await res.json()) as {
        accessToken?: string;
        refreshToken?: string;
        user?: UserProfile;
        message?: string;
      };

      if (!res.ok) {
        setError(data.message || (isRegister ? "Could not create account" : "Sign in failed"));
        return;
      }

      if (!data.accessToken || !data.refreshToken) {
        setError("Unexpected server response");
        return;
      }

      await completeAuth(data.accessToken, data.refreshToken, data.user);
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-3">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-drift absolute -top-40 left-0 right-0 mx-auto h-[420px] w-[640px] max-w-full glow-amber blur-3xl" />
        <div
          className="animate-drift absolute -right-24 bottom-[-12%] h-[400px] w-[520px] glow-violet blur-3xl"
          style={{ animationDelay: "-9s", animationDuration: "28s" }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <div
          className="animate-fade-up mb-4 text-center"
          style={{ animationDelay: "40ms" }}
        >
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent shadow-[0_0_24px_rgba(245,158,11,0.25)]">
              <Clapperboard className="h-4.5 w-4.5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              WatchStash
            </h1>
          </div>
          <p className="text-sm text-muted">Sign in to your media collection</p>
        </div>

        <div
          className="animate-fade-up rounded-2xl border border-border bg-surface/90 p-4 shadow-2xl shadow-black/50 backdrop-blur"
          style={{ animationDelay: "140ms" }}
        >
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-canvas p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                mode === "signin"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-secondary"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
                mode === "register"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-secondary"
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5" noValidate={false}>
            {mode === "register" ? (
              <>
                <label className="block">
                  <span className={labelClass}>Username</span>
                  <input
                    className={inputClass}
                    placeholder="janedoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    maxLength={30}
                    pattern="[a-z0-9_]+"
                    title="Lowercase letters, numbers, and underscores"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>Display name</span>
                  <input
                    className={inputClass}
                    placeholder="Jane Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    autoComplete="name"
                    required
                  />
                </label>
              </>
            ) : null}

            <label className="block">
              <span className={labelClass}>
                {mode === "register" ? "Email" : "Email or username"}
              </span>
              <input
                className={inputClass}
                placeholder={mode === "register" ? "you@example.com" : "you@example.com"}
                type={mode === "register" ? "email" : "text"}
                value={mode === "register" ? email : identifier}
                onChange={(e) =>
                  mode === "register"
                    ? setEmail(e.target.value)
                    : setIdentifier(e.target.value)
                }
                autoComplete="username"
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Password</span>
              <div className="relative">
                <input
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-subtle transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {mode === "register" && (
              <p className="text-xs leading-snug text-subtle">
                8+ characters with an uppercase letter, a lowercase letter, and
                a number.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_28px_rgba(245,158,11,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? mode === "register"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "register"
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="my-3 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-subtle">or continue with</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-1.5">
            {PROVIDERS.map(({ id, label, icon: Icon, comingSoon }) =>
              comingSoon ? (
                <div
                  key={id}
                  aria-disabled="true"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-2 text-sm font-medium text-primary opacity-60"
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {label}
                  <span className="ml-auto rounded-full border border-border bg-border/40 px-2 py-0.5 text-[10px] font-medium text-muted">
                    Coming soon
                  </span>
                </div>
              ) : (
                <a
                  key={id}
                  href={oauthAuthorizeUrl(id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-border-hover hover:bg-border/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {label}
                </a>
              ),
            )}
          </div>

          <p className="mt-3 text-center text-[11px] leading-snug text-subtle">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="text-muted transition-colors hover:text-secondary"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-muted transition-colors hover:text-secondary"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p
          className="animate-fade-up mt-3 text-center text-xs text-subtle"
          style={{ animationDelay: "220ms" }}
        >
          New here? A WatchStash account is created automatically the first time
          you sign in.
        </p>
      </div>
    </main>
  );
}
