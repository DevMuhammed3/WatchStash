"use client";

import { useTranslations } from "next-intl";
import type { MediaStatus } from "@watchstash/types";

const statusClasses: Record<MediaStatus, string> = {
  watching: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  on_hold: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  plan_to_watch: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

export function StatusBadge({ status }: { status: MediaStatus }) {
  const t = useTranslations("status");

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusClasses[status]}`}
    >
      {t(status)}
    </span>
  );
}