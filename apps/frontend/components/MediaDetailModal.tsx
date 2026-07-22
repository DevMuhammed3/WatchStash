"use client";

import { useEffect, useCallback } from "react";
import { X, Film, Monitor, Tv } from "lucide-react";
import { StatusBadge, StarRating } from "@watchstash/ui";
import type { MediaItem } from "@watchstash/types";

const typeIcons = {
  movie: Film,
  series: Tv,
  anime: Monitor,
} as const;

const typeLabels: Record<string, string> = {
  movie: "Movie",
  series: "Series",
  anime: "Anime",
};

interface MediaDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onRatingChange?: (id: string, rating: number) => void;
  onNotesChange?: (id: string, notes: string) => void;
}

export function MediaDetailModal({
  item,
  onClose,
  onRatingChange,
  onNotesChange,
}: MediaDetailModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (item) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [item, handleKeyDown]);

  if (!item) return null;

  const TypeIcon = typeIcons[item.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40 transition-all duration-300">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-surface/80 p-2 text-muted backdrop-blur-sm transition-colors hover:bg-border-hover hover:text-primary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative aspect-video overflow-hidden">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-surface">
              <TypeIcon className="h-16 w-16 text-subtle" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />

          <div className="absolute bottom-4 left-6 right-20">
            <h2 className="text-2xl font-bold text-primary">{item.title}</h2>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={item.status} />
              <span className="text-sm text-muted">
                {typeLabels[item.type]}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Rating
            </h3>
            <StarRating
              value={item.rating ?? 0}
              onChange={(rating) => onRatingChange?.(item._id, rating)}
            />
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Summary
            </h3>
            <p className="text-sm leading-relaxed text-secondary">
              {item.review || "No summary available."}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Genres
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-lg border border-border-hover bg-surface px-3 py-1 text-xs text-muted">
                —
              </span>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Cast
            </h3>
            <p className="text-sm text-subtle italic">No cast information yet.</p>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Progress
            </h3>
            <div className="flex flex-wrap gap-4 text-sm text-muted">
              <span>Season {item.progress.currentSeason}</span>
              {item.progress.totalEpisodes != null && (
                <span>
                  Episode {item.progress.currentEpisode} /{" "}
                  {item.progress.totalEpisodes}
                </span>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
              Personal Notes
            </h3>
            <textarea
              defaultValue={item.review ?? ""}
              onChange={(e) => onNotesChange?.(item._id, e.target.value)}
              placeholder="Write your thoughts..."
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-canvas p-3 text-sm text-secondary placeholder-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
