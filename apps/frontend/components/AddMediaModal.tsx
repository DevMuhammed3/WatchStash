"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, TrendingUp, Star, Loader2, ArrowLeft, Check, Film, Monitor, Tv } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button, Dialog, Input } from "@watchstash/ui";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import type {
  MediaItem,
  MediaSearchResult,
  MediaSearchResponse,
  MediaStatus,
  MediaType,
} from "@watchstash/types";
import { DEFAULT_STATUS, STATUS_ORDER } from "@watchstash/types";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

const typeIcons = {
  movie: Film,
  series: Tv,
  anime: Monitor,
} as const;

interface AddMediaModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: (item: MediaItem) => void;
}

export function AddMediaModal({ open, onClose, onAdded }: AddMediaModalProps) {
  const { apiFetch } = useAuth();
  const tType = useTranslations("type");
  const tStatus = useTranslations("status");
  const t = useTranslations("addMedia");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const statusOptions = STATUS_ORDER.map((value) => ({
    value,
    label: tStatus(value),
  }));

  const [tab, setTab] = useState<"search" | "trending">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingLoaded, setTrendingLoaded] = useState(false);

  const [selected, setSelected] = useState<MediaSearchResult | null>(null);
  const [type, setType] = useState<MediaType>("movie");
  const [status, setStatus] = useState<MediaStatus>(DEFAULT_STATUS);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const searchController = useRef<AbortController | null>(null);

  const reset = () => {
    setTab("search");
    setQuery("");
    setResults([]);
    setSelected(null);
    setStatus(DEFAULT_STATUS);
    setError(null);
    setAddError(null);
    setTrendingLoaded(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const resolveError = async (res: Response, fallback?: string) => {
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) return data.message;
    } catch {
      // response was not JSON (e.g. HTML error page)
    }
    return fallback ?? tErrors("requestFailed");
  };

  const loadTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`${API_BASE_URL}/api/media/trending?page=1`);
      if (!res.ok) throw new Error(await resolveError(res, tErrors("trendingFailed")));
      const data = (await res.json()) as MediaSearchResponse;
      setResults(data.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : tErrors("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [apiFetch, tErrors]);

  useEffect(() => {
    if (!open || tab !== "trending" || trendingLoaded) return;
    setTrendingLoaded(true);
    loadTrending();
  }, [open, tab, trendingLoaded, loadTrending]);

  useEffect(() => {
    if (!open || tab !== "search") return;
    searchController.current?.abort();

    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    searchController.current = controller;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(
          `${API_BASE_URL}/api/media/search?query=${encodeURIComponent(trimmed)}&page=1`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await resolveError(res, tErrors("searchFailed")));
        const data = (await res.json()) as MediaSearchResponse;
        if (!controller.signal.aborted) setResults(data.results);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : tErrors("somethingWentWrong"));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, tab, query, apiFetch, tErrors]);

  const openConfirm = (result: MediaSearchResult) => {
    setSelected(result);
    setType(result.mediaType === "movie" ? "movie" : "series");
    setAddError(null);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch(
        `${API_BASE_URL}/api/stash/from-provider`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "tmdb",
            externalId: selected.id,
            type,
            status,
          }),
        },
      );
      const json = await res.json().catch(() => null);
      const data = json as { status: string; item?: MediaItem; message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? tErrors("addFailed"));
      }
      if (data?.item) onAdded(data.item);
      close();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : tErrors("somethingWentWrong"));
    } finally {
      setAdding(false);
    }
  };

  const posterUrl = (path: string | null) => (path ? `${IMAGE_BASE_URL}${path}` : null);

  return (
    <Dialog
      open={open}
      onClose={close}
      className="rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40 max-w-5xl"
    >
      <div className="sticky top-0 z-10 border-b border-border bg-surface/95 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-primary">{t("title")}</h2>
          <div className="flex items-center gap-1 rounded-xl border border-border bg-canvas p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("search")}
              className={`rounded-md! text-sm font-medium ${
                tab === "search" ? "bg-accent/20! text-accent!" : "text-muted"
              }`}
            >
              <Search className="h-3.5 w-3.5" />
              {t("search")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("trending")}
              className={`rounded-md! text-sm font-medium ${
                tab === "trending" ? "bg-accent/20! text-accent!" : "text-muted"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {t("trending")}
            </Button>
          </div>
        </div>

        {tab === "search" && (
          <div className="mt-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="bg-canvas"
            />
          </div>
        )}
      </div>

      <div className="p-4">
        {selected ? (
          <div className="flex flex-col gap-6 sm:flex-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(null)}
              className="self-start gap-1.5! text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("backToResults")}
            </Button>

            <div className="grid flex-1 gap-6 sm:grid-cols-[8rem_1fr]">
              <div className="relative w-full">
                {posterUrl(selected.posterPath) ? (
                  <Image
                    src={posterUrl(selected.posterPath)!}
                    alt={selected.title}
                    fill
                    sizes="128px"
                    className="rounded-xl border border-border object-cover"
                  />
                ) : (
                  <div className="flex aspect-[2/3] w-full items-center justify-center rounded-xl border border-border bg-canvas">
                    <Film className="h-10 w-10 text-subtle" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary">{selected.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-sm text-muted">
                  <span className="inline-flex items-center gap-1 text-rating">
                    <Star className="h-3.5 w-3.5 fill-rating text-rating" />
                    {selected.voteAverage.toFixed(1)}
                  </span>
                  {selected.year != null && <span>{selected.year}</span>}
                  {selected.genres.slice(0, 3).map((g) => (
                    <span key={g} className="text-subtle">
                      {g}
                    </span>
                  ))}
                </div>

                {selected.overview && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-secondary">
                    {selected.overview}
                  </p>
                )}

                <div className="mt-6 space-y-4">
                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtle">
                      {t("type")}
                    </span>
                    <div className="flex gap-2">
                      {(selected.mediaType === "movie"
                        ? (["movie"] as MediaType[])
                        : (["series", "anime"] as MediaType[])).map(
                        (option) => {
                          const Icon = typeIcons[option];
                          return (
                            <Button
                              key={option}
                              variant="secondary"
                              size="md"
                              type="button"
                              onClick={() => setType(option)}
                              className={`px-3! gap-1.5! text-xs! font-medium ${
                                type === option
                                  ? "border-accent/60! bg-accent/15 text-accent!"
                                  : "text-muted!"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {tType(option)}
                            </Button>
                          );
                        },
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-subtle">
                      {t("status")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant="secondary"
                          size="md"
                          type="button"
                          onClick={() => setStatus(option.value)}
                          className={`px-3! gap-1.5! text-xs! font-medium ${
                            status === option.value
                              ? "border-accent/60! bg-accent/15 text-accent!"
                              : "text-muted!"
                          }`}
                        >
                          {status === option.value && <Check className="h-3.5 w-3.5" />}
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {addError && <p className="text-sm text-red-400">{addError}</p>}

                  <div className="flex justify-end">
                    <Button variant="primary" onClick={handleAdd} disabled={adding}>
                      {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t("title")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-muted">{tCommon("loading")}</p>
              </div>
            ) : error ? (
              <p className="py-16 text-center text-sm text-red-400">{error}</p>
            ) : results.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted">
                {tab === "search"
                  ? t("typeToSearch")
                  : t("nothingTrending")}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {results.map((result) => (
                  <button
                    key={`${result.provider}-${result.id}`}
                    type="button"
                    onClick={() => openConfirm(result)}
                    className="group text-left"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-canvas transition-colors group-hover:border-accent/50">
                      {posterUrl(result.posterPath) ? (
                        <Image
                          src={posterUrl(result.posterPath)!}
                          alt={result.title}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 220px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Film className="h-10 w-10 text-subtle" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <div className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-rating backdrop-blur-sm">
                        {result.voteAverage.toFixed(1)}
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-primary">
                      {result.title}
                    </p>
                    <p className="text-xs text-muted">
                      {result.year ?? ""} ·{" "}
                      {result.mediaType === "movie" ? tType("movie") : tType("tv")}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}