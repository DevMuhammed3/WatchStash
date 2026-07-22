"use client";

import { Film, Monitor, Tv, Star } from "lucide-react";
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { StatusBadge } from "@watchstash/ui";
import type { MediaType, MediaStatus } from "@watchstash/types";

const typeIcons: Record<MediaType, typeof Film> = {
  movie: Film,
  series: Tv,
  anime: Monitor,
};

const typeLabels: Record<MediaType, string> = {
  movie: "MOVIE",
  series: "SERIES",
  anime: "ANIME",
};

interface MediaCardProps {
  title: string;
  type: MediaType;
  posterUrl?: string;
  rating?: number;
  status: MediaStatus;
  onStatusChange?: (status: MediaStatus) => void;
  onClick?: () => void;
  compact?: boolean;
  itemId?: string;
}

const statusCycle: MediaStatus[] = [
  "plan_to_watch",
  "watching",
  "completed",
  "on_hold",
];

function nextStatus(current: MediaStatus): MediaStatus {
  const idx = statusCycle.indexOf(current);
  return statusCycle[(idx + 1) % statusCycle.length]!;
}

export function MediaCard({
  title,
  type,
  posterUrl,
  rating,
  status,
  onStatusChange,
  onClick,
  compact = false,
  itemId,
}: MediaCardProps) {
  const [imgError, setImgError] = useState(false);
  const TypeIcon = typeIcons[type];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemId ?? title,
    data: { status },
    disabled: !itemId,
  });

  return (
    <div
      suppressHydrationWarning
      ref={itemId ? setNodeRef : undefined}
      {...(itemId ? { ...listeners, ...attributes } : {})}
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-accent/5 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {posterUrl && !imgError ? (
          <img
            src={posterUrl}
            alt={title}
            className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <TypeIcon className="h-12 w-12 text-subtle" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <h3 className="text-center text-sm font-semibold text-primary line-clamp-2">
            {title}
          </h3>
          <StatusBadge status={status} />
        </div>

        {rating != null && (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-rating text-rating" />
            <span className="text-xs font-semibold text-rating">
              {rating}
            </span>
          </div>
        )}

        <div className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-1 backdrop-blur-sm">
          <span className="text-[10px] font-semibold tracking-wider text-secondary">
            {typeLabels[type]}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-primary">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-subtle">{typeLabels[type]}</p>
          </div>

          {onStatusChange && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(nextStatus(status));
              }}
              className="shrink-0 text-xs text-subtle underline-offset-2 hover:text-accent-hover hover:underline"
              title={`Change status (currently: ${status})`}
            >
              {status === "plan_to_watch"
                ? "Start"
                : status === "watching"
                  ? "Done"
                  : status === "completed"
                    ? "Hold"
                    : "Plan"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
