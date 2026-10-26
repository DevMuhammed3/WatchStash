"use client";

import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/AppHeader";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { DangerZone } from "@/components/settings/DangerZone";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const { status } = useAuth();
  const t = useTranslations("settings");

  return (
    <>
      <AppHeader />
      <main className="relative mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
            {t("description")}
          </p>
        </header>

        {status === "authenticated" ? (
          <div className="space-y-6">
            <ProfileSettings />
            <SecuritySettings />
            <DangerZone />
          </div>
        ) : null}
      </main>
    </>
  );
}
