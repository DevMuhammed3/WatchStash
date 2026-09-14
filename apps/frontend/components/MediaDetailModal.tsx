"use client";

import { X, Film, Monitor, Tv, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button, StatusBadge, StarRating, Dialog } from "@watchstash/ui";
import type { MediaItem } from "@watchstash/types";

const typeIcons = {
  movie: Film,
  series: Tv,
  anime: Monitor,
} as const;

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
  const tType = useTranslations("type");
  const t = useTranslations("mediaDetail");
  const TypeIcon = typeIcons[item?.type ?? "movie"];

  return (
    <Dialog
      open={Boolean(item)}
      onClose={onClose}
      className="rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40 sm:m-8 max-w-2xl"
    >
      {item && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 bg-surface/80! backdrop-blur-sm hover:bg-border-hover!"
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative aspect-video w-full overflow-hidden sm:rounded-t-2xl">
            {item.backdropUrl ? (
              <Image
                src={item.backdropUrl}
                alt={item.title}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-cover"
              />
            ) : item.posterUrl ? (
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-cover"
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
                  {tType(item.type)}
                  {item.year ? ` · ${item.year}` : ""}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {item.overview && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                  {t("summary")}
                </h3>
                <p className="text-sm leading-relaxed text-secondary">
                  {item.overview}
                </p>
              </section>
            )}

            {item.genres && item.genres.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                  {t("genres")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-lg border border-border-hover bg-surface px-3 py-1 text-xs text-muted"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {item.tmdbRating != null && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                  {t("communityRating")}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span className="inline-flex items-center gap-1 font-semibold text-rating">
                    <Star className="h-4 w-4 fill-rating text-rating" />
                    {item.tmdbRating.toFixed(1)}
                  </span>
                  {item.tmdbVoteCount != null && (
                    <span>{t("votes", { count: item.tmdbVoteCount })}</span>
                  )}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                {t("yourRating")}
              </h3>
              <StarRating
                value={item.rating ?? 0}
                onChange={(rating) => onRatingChange?.(item._id, rating)}
              />
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                {t("progress")}
              </h3>
              <div className="flex flex-wrap gap-4 text-sm text-muted">
                <span>{t("season", { season: item.progress.currentSeason })}</span>
                {item.progress.totalEpisodes != null && (
                  <span>
                    {t("episode", {
                      current: item.progress.currentEpisode,
                      total: item.progress.totalEpisodes,
                    })}
                  </span>
                )}
              </div>
            </section>

            {item.tags && item.tags.length > 0 && (
              <section>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                  {t("tags")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-border-hover bg-surface px-3 py-1 text-xs text-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-subtle">
                {t("notes")}
              </h3>
              <textarea
                value={item.review ?? ""}
                onChange={(e) => onNotesChange?.(item._id, e.target.value)}
                placeholder={t("notesPlaceholder")}
                rows={4}
                className="w-full resize-none rounded-xl border border-border bg-canvas p-3 text-sm text-secondary placeholder-subtle transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </section>
          </div>
        </>
      )}
    </Dialog>
  );
}