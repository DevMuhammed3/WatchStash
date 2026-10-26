"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button, Dialog, Input } from "@watchstash/ui";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import { SettingsCard } from "./SettingsCard";

export function DangerZone() {
  const { user, apiFetch, logout } = useAuth();
  const t = useTranslations("settings");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const confirmed =
    confirmation.trim().toLowerCase() === user.username.toLowerCase();

  async function handleDelete() {
    if (!confirmed) return;

    setError(null);
    setDeleting(true);

    try {
      const response = await apiFetch(`${API_BASE_URL}/api/auth/me`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: confirmation.trim() }),
      });

      const data = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(data?.message ?? t("danger.error"));
      }

      setOpen(false);
      await logout();
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("danger.error"));
      setDeleting(false);
    }
  }

  function closeDialog() {
    if (deleting) return;
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  return (
    <SettingsCard
      danger
      title={t("danger.title")}
      description={t("danger.description")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/15 bg-red-500/[0.04] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-primary">
            {t("danger.delete")}
          </p>
          <p className="mt-0.5 text-xs text-muted">{t("danger.deleteHint")}</p>
        </div>
        <Button variant="danger" onClick={() => setOpen(true)}>
          {t("danger.delete")}
        </Button>
      </div>

      <Dialog
        open={open}
        onClose={closeDialog}
        className="max-w-md rounded-2xl border border-red-500/20 bg-surface p-6 shadow-2xl shadow-black/60"
      >
        <h2 className="text-lg font-semibold text-primary">
          {t("danger.dialogTitle")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {t("danger.dialogBody")}
        </p>

        <p className="mt-5 text-xs text-secondary">
          {t("danger.confirmLabel")}
        </p>
        <code className="mt-1 block rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-1.5 text-xs text-accent">
          {user.username}
        </code>

        <Input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={t("danger.confirmPlaceholder", {
            username: user.username,
          })}
          autoComplete="off"
          spellCheck={false}
          className="mt-3"
        />

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-center gap-1.5 text-xs text-red-400"
          >
            <AlertCircle aria-hidden className="h-3.5 w-3.5" />
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={closeDialog} disabled={deleting}>
            {t("danger.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!confirmed || deleting}
          >
            {deleting ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                {t("danger.deleting")}
              </>
            ) : (
              t("danger.confirm")
            )}
          </Button>
        </div>
      </Dialog>
    </SettingsCard>
  );
}
