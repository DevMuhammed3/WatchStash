"use client";

import { useState } from "react";
import type { ComponentType, FormEvent } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { Button, Input } from "@watchstash/ui";
import type { ConnectedProviders, UserProfile } from "@watchstash/types";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import {
  FacebookIcon,
  GitHubIcon,
  GoogleIcon,
  XIcon,
} from "@/components/brand-icons";
import { SettingsCard } from "./SettingsCard";

const PROVIDERS: Array<{
  key: keyof ConnectedProviders;
  labelKey: "google" | "github" | "facebook" | "twitter";
  Icon: ComponentType<{ className?: string }>;
}> = [
  { key: "google", labelKey: "google", Icon: GoogleIcon },
  { key: "github", labelKey: "github", Icon: GitHubIcon },
  { key: "facebook", labelKey: "facebook", Icon: FacebookIcon },
  { key: "twitter", labelKey: "twitter", Icon: XIcon },
];

export function SecuritySettings() {
  const { user, apiFetch, updateUser } = useAuth();
  const t = useTranslations("settings");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [signingOutOthers, setSigningOutOthers] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsMessage, setSessionsMessage] = useState<string | null>(null);

  const hasPassword = user?.hasPassword ?? false;

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (hasPassword && !currentPassword) {
      setPasswordError(t("security.currentPasswordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("security.passwordMismatch"));
      return;
    }

    setSavingPassword(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          ...(hasPassword ? { currentPassword } : {}),
        }),
      });

      const data = (await response.json().catch(() => null)) as {
        message?: string;
        user?: UserProfile;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? t("security.passwordError"));
      }

      if (data?.user) {
        updateUser(data.user);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage(
        hasPassword ? t("security.passwordUpdated") : t("security.passwordSetDone"),
      );
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : t("security.passwordError"),
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOutOthers() {
    setSessionsError(null);
    setSessionsMessage(null);
    setSigningOutOthers(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/logout-others`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? t("security.sessionsError"));
      }

      setSessionsMessage(t("security.sessionsSignedOut"));
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : t("security.sessionsError"),
      );
    } finally {
      setSigningOutOthers(false);
    }
  }

  if (!user) return null;

  return (
    <SettingsCard
      title={t("security.title")}
      description={t("security.description")}
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-primary">
            {t("security.providersTitle")}
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {PROVIDERS.map(({ key, labelKey, Icon }) => {
              const connected = user.providers[key];
              return (
                <li
                  key={key}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs text-secondary">
                    {t(`security.providers.${labelKey}`)}
                  </span>
                  <span
                    className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                      connected
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-white/10 text-muted/70"
                    }`}
                  >
                    {connected
                      ? t("security.connected")
                      : t("security.notConnected")}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-white/[0.06] pt-6">
          <h3 className="text-sm font-semibold text-primary">
            {t("security.passwordTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {hasPassword
              ? t("security.passwordSet")
              : t("security.passwordNotSet")}
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
            {hasPassword && (
              <div>
                <label
                  htmlFor="settings-current-password"
                  className="text-xs font-medium text-secondary"
                >
                  {t("security.currentPassword")}
                </label>
                <Input
                  id="settings-current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-1.5"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="settings-new-password"
                  className="text-xs font-medium text-secondary"
                >
                  {t("security.newPassword")}
                </label>
                <Input
                  id="settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-1.5"
                />
              </div>

              <div>
                <label
                  htmlFor="settings-confirm-password"
                  className="text-xs font-medium text-secondary"
                >
                  {t("security.confirmPassword")}
                </label>
                <Input
                  id="settings-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="mt-1.5"
                />
              </div>
            </div>

            <p className="text-[11px] text-muted">{t("security.passwordHelp")}</p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={savingPassword || !newPassword || !confirmPassword}
              >
                {savingPassword ? (
                  <>
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                    {t("security.saving")}
                  </>
                ) : hasPassword ? (
                  t("security.changePassword")
                ) : (
                  t("security.setPassword")
                )}
              </Button>

              <span aria-live="polite" className="text-xs">
                {passwordError ? (
                  <span className="inline-flex items-center gap-1.5 text-red-400">
                    <AlertCircle aria-hidden className="h-3.5 w-3.5" />
                    {passwordError}
                  </span>
                ) : passwordMessage ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <Check aria-hidden className="h-3.5 w-3.5" />
                    {passwordMessage}
                  </span>
                ) : null}
              </span>
            </div>
          </form>
        </div>

        <div className="border-t border-white/[0.06] pt-6">
          <h3 className="text-sm font-semibold text-primary">
            {t("security.sessionsTitle")}
          </h3>
          <p className="mt-1 text-xs text-muted">
            {t("security.sessionsBody")}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleSignOutOthers}
              disabled={signingOutOthers}
            >
              {signingOutOthers ? (
                <>
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  {t("security.signingOut")}
                </>
              ) : (
                t("security.signOutOthers")
              )}
            </Button>

            <span aria-live="polite" className="text-xs">
              {sessionsError ? (
                <span className="inline-flex items-center gap-1.5 text-red-400">
                  <AlertCircle aria-hidden className="h-3.5 w-3.5" />
                  {sessionsError}
                </span>
              ) : sessionsMessage ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <Check aria-hidden className="h-3.5 w-3.5" />
                  {sessionsMessage}
                </span>
              ) : null}
            </span>
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
