import type { MediaStatus } from "@watchstash/types";

const statusConfig: Record<MediaStatus, { label: string; classes: string }> = {
  watching: {
    label: "Watching",
    classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  completed: {
    label: "Completed",
    classes: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  on_hold: {
    label: "On Hold",
    classes: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  },
  plan_to_watch: {
    label: "Plan to Watch",
    classes: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  },
};

export function StatusBadge({ status }: { status: MediaStatus }) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
