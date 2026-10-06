"use client";

import { useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";
import icon from "../../../public/512×512_icon.png";
import loginBg from "../../../public/login_bg.png";
import { API_BASE_URL, oauthAuthorizeUrl } from "@/lib/auth";
import { Button, Input } from "@watchstash/ui";
import { GoogleIcon, GitHubIcon, FacebookIcon, XIcon } from "@/components/brand-icons";
import type { OAuthProvider, UserProfile } from "@watchstash/types";

const PROVIDERS: Array<{
  id: OAuthProvider;
  icon: typeof GitHubIcon;
  comingSoon?: boolean;
}> = [
  { id: "google", icon: GoogleIcon },
  { id: "github", icon: GitHubIcon },
  { id: "facebook", icon: FacebookIcon, comingSoon: true },
  { id: "twitter", icon: XIcon, comingSoon: true },
];

type Mode = "signin" | "register";

const inputClass =
  "w-full rounded-lg! border border-border bg-canvas px-3! py-2! text-sm text-primary! transition-all! duration-200 placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

const labelClass = "mb-1 block text-xs font-medium text-secondary";

export default function LoginPage() {
  const { status, completeAuth } = useAuth();
  const router = useRouter();
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

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
        // Accept the httpOnly refresh cookie the API sets on this response —
        // without this the browser discards the Set-Cookie header.
        credentials: "include",
        body: JSON.stringify(
          isRegister
            ? { username, displayName, email, password }
            : { identifier, password },
        ),
      });

      const data = (await res.json()) as {
        accessToken?: string;
        user?: UserProfile;
        message?: string;
      };

      if (!res.ok) {
        setError(
          data.message ||
            (isRegister ? tErrors("createAccountFailed") : tErrors("signInFailed")),
        );
        return;
      }

      if (!data.accessToken) {
        setError(tErrors("unexpectedResponse"));
        return;
      }

      await completeAuth(data.accessToken, data.user);
    } catch {
      setError(tErrors("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-3">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <Image
          src={loginBg}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative w-full max-w-sm">
        <div
          className="animate-fade-up mb-4 text-center"
          style={{ animationDelay: "40ms" }}
        >
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl">
              <Image
                src={icon}
                alt="WatchStash logo"
                width={36}
                height={36}
                className="h-full w-full"
                priority
              />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-primary">
              WatchStash
            </h1>
          </div>
          <p className="text-sm text-muted">{t("tagline")}</p>
        </div>

        <div
          className="animate-fade-up rounded-2xl border border-border bg-surface/90 p-4 shadow-2xl shadow-black/50 backdrop-blur"
          style={{ animationDelay: "140ms" }}
        >
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-canvas p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => switchMode("signin")}
              className={`rounded-md text-sm font-medium transition-all! duration-200 ${
                mode === "signin"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-secondary"
              }`}
            >
              {t("signIn")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => switchMode("register")}
              className={`rounded-md text-sm font-medium transition-all! duration-200 ${
                mode === "register"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-secondary"
              }`}
            >
              {t("createAccount")}
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2.5" noValidate={false}>
            {mode === "register" ? (
              <>
                <label className="block">
                  <span className={labelClass}>{t("username")}</span>
                  <Input
                    className={inputClass}
                    placeholder={t("usernamePlaceholder")}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    minLength={3}
                    maxLength={30}
                    pattern="[a-z0-9_]+"
                    title={t("usernameHelp")}
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="block">
                  <span className={labelClass}>{t("displayName")}</span>
                  <Input
                    className={inputClass}
                    placeholder={t("namePlaceholder")}
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
                {mode === "register" ? t("email") : t("emailOrUsername")}
              </span>
              <Input
                className={inputClass}
                placeholder={t("emailPlaceholder")}
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
              <span className={labelClass}>{t("password")}</span>
              <div className="relative">
                <Input
                  className={`${inputClass} pr-10!`}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle! hover:text-secondary! hover:bg-transparent! active:bg-transparent!"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {mode === "register" && (
              <p className="text-xs leading-snug text-subtle">
                {t("passwordHelp")}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full rounded-lg! py-2.5! font-semibold! bg-accent! text-black! shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all! duration-200 hover:bg-accent-hover! hover:shadow-[0_0_28px_rgba(245,158,11,0.3)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? mode === "register"
                  ? t("creatingAccount")
                  : t("signingIn")
                : mode === "register"
                  ? t("createAccount")
                  : t("signIn")}
            </Button>
          </form>

          <div className="my-3 flex items-center gap-3" aria-hidden>
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-subtle">{t("orContinueWith")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-1.5">
            {PROVIDERS.map(({ id, icon: Icon, comingSoon }) =>
              comingSoon ? (
                <div
                  key={id}
                  aria-disabled="true"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-2 text-sm font-medium text-primary opacity-60"
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {t(`providers.${id}`)}
                  <span className="ml-auto rounded-full border border-border bg-border/40 px-2 py-0.5 text-[10px] font-medium text-muted">
                    {tCommon("comingSoon")}
                  </span>
                </div>
              ) : (
                <a
                  key={id}
                  href={oauthAuthorizeUrl(id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-canvas px-4 py-2 text-sm font-medium text-primary transition-all duration-200 hover:border-border-hover hover:bg-border/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  {t(`providers.${id}`)}
                </a>
              ),
            )}
          </div>

          <p className="mt-3 text-center text-[11px] leading-snug text-subtle">
            {t.rich("legalNote", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  className="text-muted transition-colors hover:text-secondary"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  className="text-muted transition-colors hover:text-secondary"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <p
          className="animate-fade-up mt-3 text-center text-xs text-subtle"
          style={{ animationDelay: "220ms" }}
        >
          {t("newHere")}
        </p>
      </div>
    </main>
  );
}