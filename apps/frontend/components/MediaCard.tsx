"use client";

import { Film, Monitor, Tv, Star } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDraggable } from "@dnd-kit/core";
import { Button, StatusBadge } from "@watchstash/ui";
import Image from "next/image";
import type { MediaType, MediaStatus } from "@watchstash/types";
import { STATUS_ORDER } from "@watchstash/types";

const typeIcons: Record<MediaType, typeof Film> = {
  movie: Film,
  series: Tv,
  anime: Monitor,
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

const statusCycle: readonly MediaStatus[] = STATUS_ORDER;

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
  const tType = useTranslations("type");
  const tStatus = useTranslations("status");
  const t = useTranslations("mediaCard");
  const TypeIcon = typeIcons[type];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: itemId ?? title,
    data: { status },
    disabled: !itemId,
  });

  const statusActionLabel =
    status === "plan_to_watch"
      ? t("actionStart")
      : status === "watching"
        ? t("actionDone")
        : status === "completed"
          ? t("actionHold")
          : t("actionPlan");

  return (
    <div
      suppressHydrationWarning
      ref={itemId ? setNodeRef : undefined}
      {...(itemId ? { ...listeners, ...attributes } : {})}
      onClick={onClick}
      className={`group relative z-0 flex cursor-pointer flex-col overflow-hidden rounded-xl border border-border bg-surface transition-[transform,box-shadow,border-color] duration-300 ease-out hover:z-20 hover:-translate-y-1 hover:border-accent/40 hover:shadow-2xl hover:shadow-black/70 hover:ring-1 hover:ring-accent/25 focus-within:z-20 focus-within:-translate-y-1 focus-within:border-accent/40 focus-within:shadow-2xl focus-within:shadow-black/70 focus-within:ring-1 focus-within:ring-accent/25 motion-reduce:transform-none ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="relative aspect-[2/3] overflow-hidden">
        {posterUrl && !imgError ? (
          <Image
            src={posterUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 45vw, 340px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.08] motion-reduce:scale-100 motion-reduce:transition-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface">
            <TypeIcon className="h-8 w-8 text-subtle" />
          </div>
        )}

        {/* Soft frost: backdrop-filter is only mounted while hovered, so idle
            cards in the scroller never pay for it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-canvas/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:backdrop-blur-[3px]"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-canvas/95 via-canvas/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {/* Frosted glass panel. pointer-events stay off until hover so the
            invisible panel never swallows the card's click. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 p-2.5 opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 focus-within:pointer-events-auto focus-within:translate-y-0 focus-within:opacity-100 motion-reduce:translate-y-0">
          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-2.5 backdrop-blur-xl">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-secondary/90">
              {tType(type)}
            </p>

            <h3 className="mt-1 line-clamp-2 font-display text-[26px] leading-[0.95] tracking-wide text-primary">
              {title}
            </h3>

            <div className="mt-2 flex items-center justify-between gap-2">
              <StatusBadge status={status} />

              {rating != null && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="h-3 w-3 fill-rating text-rating" />
                  <span className="text-xs font-semibold text-rating">
                    {rating}
                  </span>
                </span>
              )}
            </div>

            {onStatusChange && compact && (
              <Button
                variant="primary"
                size="sm"
                type="button"
                tabIndex={-1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(nextStatus(status));
                }}
                className="mt-2 w-full rounded-lg! py-1.5! text-xs!"
                title={t("changeStatus", { status: tStatus(status) })}
              >
                {statusActionLabel}
              </Button>
            )}
          </div>
        </div>

        {rating != null && (
          <div className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm transition-all duration-300 group-hover:scale-95 group-hover:opacity-0">
            <Star className="h-2.5 w-2.5 fill-rating text-rating" />
            <span className="text-[10px] font-semibold text-rating">
              {rating}
            </span>
          </div>
        )}

        <div className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 backdrop-blur-sm transition-all duration-300 group-hover:scale-95 group-hover:opacity-0">
          <span className="text-[8px] font-semibold uppercase tracking-wider text-secondary">
            {tType(type)}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-primary">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-subtle">{tType(type)}</p>
          </div>

          {onStatusChange && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(nextStatus(status));
              }}
              className="shrink-0 rounded-none! p-0! text-xs text-subtle underline-offset-2 hover:underline hover:text-accent-hover! hover:bg-transparent! active:bg-transparent!"
              title={t("changeStatus", { status: tStatus(status) })}
            >
              {statusActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
