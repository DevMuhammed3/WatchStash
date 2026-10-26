import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import type { MediaStatus, MediaType } from "@watchstash/types";
import type { routing } from "@/i18n/routing";
import { getShowcasePosters } from "@/lib/showcase";

type Locale = (typeof routing.locales)[number];

type PosterArtKind = "sun" | "rings" | "moon" | "speed" | "wave" | "stars";

interface Poster {
  title: string;
  type: MediaType;
  status: MediaStatus;
  rating: string;
  gradient: string;
  art: PosterArtKind;
  posterUrl?: string;
}

const POSTERS: Poster[] = [
  {
    title: "Neon Horizon",
    type: "movie",
    status: "watching",
    rating: "8.4",
    gradient: "from-[#fb923c] via-[#9a3412] to-[#1c1917]",
    art: "sun",
  },
  {
    title: "The Last Signal",
    type: "series",
    status: "completed",
    rating: "9.1",
    gradient: "from-[#22d3ee] via-[#0e7490] to-[#082f49]",
    art: "rings",
  },
  {
    title: "Paper Moon",
    type: "anime",
    status: "plan_to_watch",
    rating: "—",
    gradient: "from-[#fef3c7] via-[#d6b98c] to-[#3f2d1f]",
    art: "moon",
  },
  {
    title: "Midnight Run",
    type: "movie",
    status: "completed",
    rating: "7.8",
    gradient: "from-[#a78bfa] via-[#4c1d95] to-[#12071f]",
    art: "speed",
  },
  {
    title: "Ghost Frequency",
    type: "series",
    status: "watching",
    rating: "8.7",
    gradient: "from-[#4ade80] via-[#166534] to-[#052e16]",
    art: "wave",
  },
  {
    title: "The Long Night",
    type: "anime",
    status: "on_hold",
    rating: "9.3",
    gradient: "from-[#818cf8] via-[#1e1b4b] to-[#020617]",
    art: "stars",
  },
];

const STATUS_STYLES: Record<MediaStatus, string> = {
  watching: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  completed: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  on_hold: "border-orange-500/30 bg-orange-500/15 text-orange-300",
  plan_to_watch: "border-violet-500/30 bg-violet-500/15 text-violet-300",
};

// Statuses are a product concept rather than TMDB metadata, so the preview
// assigns them decoratively while the artwork and titles stay real.
const SHOWCASE_STATUSES: MediaStatus[] = [
  "watching",
  "completed",
  "plan_to_watch",
  "completed",
  "watching",
  "on_hold",
];

async function getHeroPosters(): Promise<Poster[]> {
  const showcase = await getShowcasePosters(POSTERS.length);
  if (showcase.length === 0) return POSTERS;

  return showcase.map((item, index) => {
    const fallback = POSTERS[index % POSTERS.length]!;
    return {
      title: item.title,
      type: item.mediaType === "tv" ? "series" : "movie",
      status: SHOWCASE_STATUSES[index % SHOWCASE_STATUSES.length]!,
      rating: item.voteAverage > 0 ? item.voteAverage.toFixed(1) : "—",
      gradient: fallback.gradient,
      art: fallback.art,
      posterUrl: item.posterUrl,
    };
  });
}

function PosterArt({ kind }: { kind: PosterArtKind }) {
  switch (kind) {
    case "sun":
      return (
        <>
          <div className="absolute left-1/2 top-[22%] h-[34%] w-[54%] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-100 via-amber-300 to-orange-500 shadow-[0_0_40px_10px_rgba(251,146,60,0.35)]" />
          <div className="absolute inset-x-0 top-[47%] h-px bg-black/50" />
          <div className="absolute inset-x-0 top-[49%] h-[16%] bg-[repeating-linear-gradient(180deg,rgba(0,0,0,0.35)_0px,rgba(0,0,0,0.35)_1px,transparent_1px,transparent_5px)]" />
        </>
      );
    case "rings":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-[84%] w-[84%] rounded-full border border-cyan-100/15" />
          <span className="absolute h-[62%] w-[62%] rounded-full border border-cyan-100/25" />
          <span className="absolute h-[40%] w-[40%] rounded-full border border-cyan-100/35" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-100/90 shadow-[0_0_20px_6px_rgba(165,243,252,0.35)]" />
        </div>
      );
    case "moon":
      return (
        <>
          <div className="absolute left-1/2 top-[20%] h-[38%] w-[60%] -translate-x-1/2 rounded-full bg-gradient-to-br from-[#fffdf5] via-[#f5e6c8] to-[#b8905f] shadow-[0_0_40px_10px_rgba(254,243,199,0.25)]" />
          <span className="absolute left-[18%] top-[14%] h-0.5 w-0.5 rounded-full bg-white/80" />
          <span className="absolute right-[20%] top-[24%] h-0.5 w-0.5 rounded-full bg-white/60" />
          <span className="absolute left-[28%] top-[34%] h-px w-px rounded-full bg-white/50" />
        </>
      );
    case "speed":
      return (
        <div className="absolute inset-0 overflow-hidden">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{ top: `${26 + index * 13}%` }}
              className="absolute left-[-20%] h-px w-[140%] -rotate-[32deg] bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          ))}
          <span className="absolute right-[14%] top-[16%] h-8 w-8 rounded-full border border-violet-200/40" />
        </div>
      );
    case "wave":
      return (
        <div className="absolute inset-x-0 top-[41%] flex h-[26%] items-center justify-center gap-[3px]">
          {[30, 55, 80, 45, 95, 60, 35, 75, 50, 88, 40, 65].map((height, index) => (
            <span
              key={index}
              style={{ height: `${height}%` }}
              className="w-[3px] rounded-full bg-emerald-200/70"
            />
          ))}
        </div>
      );
    case "stars":
      return (
        <>
          <div className="absolute left-[58%] top-[16%] h-[36%] w-[36%] rounded-full bg-indigo-100/90 shadow-[0_0_30px_10px_rgba(199,210,254,0.22)]" />
          <div className="absolute left-[50%] top-[12%] h-[36%] w-[36%] rounded-full bg-[#1e1b4b]" />
          <span className="absolute left-[20%] top-[20%] h-0.5 w-0.5 rounded-full bg-white/80" />
          <span className="absolute left-[34%] top-[42%] h-px w-px rounded-full bg-white/60" />
          <span className="absolute right-[22%] top-[58%] h-0.5 w-0.5 rounded-full bg-white/50" />
          <span className="absolute left-[18%] top-[62%] h-px w-px rounded-full bg-white/40" />
        </>
      );
  }
}

export async function StashPreview({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const tType = await getTranslations({ locale, namespace: "type" });
  const tStatus = await getTranslations({ locale, namespace: "status" });
  const posters = await getHeroPosters();

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-6 rounded-[2rem] bg-accent/[0.07] blur-3xl" />
      <div className="absolute -bottom-10 -right-8 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0e]/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/[0.04] backdrop-blur-xl transition-transform duration-700 ease-out lg:rotate-[1.5deg]">
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 rounded-full bg-white/15" />
            <span className="h-2 w-2 rounded-full bg-white/10" />
            <span className="h-2 w-2 rounded-full bg-white/[0.07]" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-black/30 px-2.5 py-1 text-[9px] text-white/35">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            {t("preview.windowUrl")}
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-accent to-orange-700 text-[8px] font-bold text-canvas">
            W
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">
                {t("preview.libraryLabel")}
              </p>
              <h2 className="mt-1 font-display text-[30px] leading-none tracking-wide text-white">
                {t("preview.libraryTitle")}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium text-white/55">{t("preview.titleCount")}</p>
              <p className="mt-0.5 text-[9px] text-white/25">{t("preview.synced")}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2">
            <Search className="h-3 w-3 text-white/30" />
            <span className="text-[10px] text-white/30">{t("preview.search")}</span>
            <span className="ml-auto rounded border border-white/[0.08] px-1.5 py-0.5 text-[8px] text-white/25">
              ⌘K
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {(["all", "watching", "planned", "completed"] as const).map((tab) => (
              <span
                key={tab}
                className={`rounded-full px-2.5 py-1 text-[9px] font-medium ${
                  tab === "all"
                    ? "bg-accent text-black"
                    : "border border-white/[0.06] text-white/40"
                }`}
              >
                {t(`preview.tabs.${tab}`)}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {posters.map((poster, index) => (
              <div
                key={`${poster.title}-${index}`}
                className="relative aspect-[2/3] overflow-hidden rounded-md border border-white/10 bg-surface"
              >
                {poster.posterUrl ? (
                  <Image
                    src={poster.posterUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 30vw, 180px"
                    className="object-cover"
                  />
                ) : (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${poster.gradient}`}
                    />
                    <PosterArt kind={poster.art} />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/35" />

                <span
                  className={`absolute left-1.5 top-1.5 rounded-full border px-1.5 py-0.5 text-[7px] font-medium ${STATUS_STYLES[poster.status]}`}
                >
                  {tStatus(poster.status)}
                </span>
                <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded bg-black/50 px-1 py-0.5 text-[7px] font-semibold text-amber-200 backdrop-blur-sm">
                  <Star className="h-2 w-2 fill-current" />
                  {poster.rating}
                </span>

                <div className="absolute inset-x-0 bottom-0 p-2">
                  <p className="text-[7px] uppercase tracking-[0.18em] text-white/50">
                    {tType(poster.type)}
                  </p>
                  <p className="line-clamp-2 font-display text-[13px] leading-[0.95] tracking-wide text-white">
                    {poster.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-16 -left-6 hidden w-52 rounded-xl border border-white/10 bg-[#151517]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl sm:block">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">
          {t("preview.queueLabel")}
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <div className="flex -space-x-2">
            {posters.slice(0, 3).map((poster, index) => (
              <span
                key={`${poster.title}-${index}`}
                className={`relative h-9 w-7 overflow-hidden rounded border border-white/20 bg-gradient-to-br ${poster.gradient}`}
              >
                {poster.posterUrl ? (
                  <Image
                    src={poster.posterUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="28px"
                    className="object-cover"
                  />
                ) : null}
              </span>
            ))}
          </div>
          <div>
            <p className="text-xs font-medium text-white">{t("preview.queueTitle")}</p>
            <p className="text-[10px] text-white/45">{t("preview.queueMeta")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
