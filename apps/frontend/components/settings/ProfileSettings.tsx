"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button, Input } from "@watchstash/ui";
import type { UserProfile } from "@watchstash/types";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import { SettingsCard } from "./SettingsCard";

function initialsFor(displayName: string, username: string): string {
  const source = displayName || username || "?";
  return (
    source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || source.slice(0, 1).toUpperCase()
  );
}

export function ProfileSettings() {
  const { user, apiFetch, updateUser } = useAuth();
  const t = useTranslations("settings");

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName);
    setUsername(user.username);
    setBio(user.bio);
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  const dirty =
    Boolean(user) &&
    (displayName !== user!.displayName ||
      username !== user!.username ||
      bio !== user!.bio ||
      avatarUrl !== user!.avatarUrl);

  // Clear a stale "Saved" note as soon as the form is edited again.
  useEffect(() => {
    if (dirty) setMessage(null);
  }, [dirty]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const nextDisplayName = displayName.trim();
    const nextUsername = username.trim();

    if (!nextDisplayName) {
      setError(t("profile.displayNameRequired"));
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(nextUsername)) {
      setError(t("profile.usernameInvalid"));
      return;
    }

    setSaving(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: nextDisplayName,
          username: nextUsername,
          bio: bio.trim(),
          avatarUrl: avatarUrl.trim(),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        user?: UserProfile;
        message?: string;
      } | null;

      if (!response.ok || !data?.user) {
        throw new Error(data?.message ?? t("profile.error"));
      }

      updateUser(data.user);
      setMessage(t("saved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("profile.error"));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <SettingsCard
      title={t("profile.title")}
      description={t("profile.description")}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-lg font-semibold text-accent ring-1 ring-white/10">
            {avatarUrl && !avatarFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={t("profile.avatarAlt")}
                className="h-full w-full object-cover"
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              initialsFor(displayName, username || user.username)
            )}
          </span>

          <div className="min-w-0 flex-1 sm:min-w-[16rem]">
            <label
              htmlFor="settings-avatar-url"
              className="text-xs font-medium text-secondary"
            >
              {t("profile.avatarUrl")}
            </label>
            <Input
              id="settings-avatar-url"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://…"
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted">
              {t("profile.avatarHint")}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="settings-display-name"
              className="text-xs font-medium text-secondary"
            >
              {t("profile.displayName")}
            </label>
            <Input
              id="settings-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={50}
              autoComplete="name"
              className="mt-1.5"
            />
          </div>

          <div>
            <label
              htmlFor="settings-username"
              className="text-xs font-medium text-secondary"
            >
              {t("profile.username")}
            </label>
            <Input
              id="settings-username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase())
              }
              maxLength={30}
              autoComplete="username"
              className="mt-1.5"
            />
            <p className="mt-1 text-[11px] text-muted">
              {t("profile.usernameHint")}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="settings-bio"
              className="text-xs font-medium text-secondary"
            >
              {t("profile.bio")}
            </label>
            <span className="text-[10px] tabular-nums text-muted">
              {t("profile.bioCount", { count: bio.length })}
            </span>
          </div>
          <textarea
            id="settings-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={500}
            rows={4}
            placeholder={t("profile.bioPlaceholder")}
            className="mt-1.5 w-full resize-y rounded-xl border border-border bg-canvas px-4 py-2.5 text-sm text-secondary placeholder-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div>
          <span className="text-xs font-medium text-secondary">
            {t("profile.email")}
          </span>
          <div className="mt-1.5 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-2.5 text-sm text-muted">
            {user.email}
          </div>
          <p className="mt-1 text-[11px] text-muted">{t("profile.emailHint")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={saving || !dirty}>
            {saving ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                {t("profile.saving")}
              </>
            ) : (
              t("profile.save")
            )}
          </Button>

          <span aria-live="polite" className="text-xs">
            {error ? (
              <span className="inline-flex items-center gap-1.5 text-red-400">
                <AlertCircle aria-hidden className="h-3.5 w-3.5" />
                {error}
              </span>
            ) : message ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <Check aria-hidden className="h-3.5 w-3.5" />
                {message}
              </span>
            ) : null}
          </span>
        </div>
      </form>
    </SettingsCard>
  );
}
