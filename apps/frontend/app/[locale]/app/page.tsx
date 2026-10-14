"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/auth";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Loader2, AlertCircle, Star, TrendingUp, Film, Tv } from "lucide-react";
import { Button } from "@watchstash/ui";
import { AppHeader } from "@/components/AppHeader";
import type { MediaSearchResponse, MediaSearchResult } from "@watchstash/types";

const AddMediaModal = dynamic(() =>
  import("@/components/AddMediaModal").then((m) => m.AddMediaModal),
);

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

interface DiscoverySectionState {
  results: MediaSearchResult[];
  loading: boolean;
  error: string | null;
}

const emptyState = (): DiscoverySectionState => ({
  results: [],
  loading: true,
  error: null,
});

export default function DiscoveryHome() {
  const { user, logout, apiFetch } = useAuth();
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tHome = useTranslations("home");

  const [trending, setTrending] = useState<DiscoverySectionState>(emptyState());
  const [popularMovies, setPopularMovies] = useState<DiscoverySectionState>(emptyState());
  const [popularTv, setPopularTv] = useState<DiscoverySectionState>(emptyState());
  const [selectedResult, setSelectedResult] = useState<MediaSearchResult | null>(null);

  const resolveError = async (response: Response, fallback: string) => {
    try {
      const data = (await response.json()) as { message?: string };
      if (data?.message) return data.message;
    } catch {
      // Response was not JSON (e.g. HTML error page).
    }
    return fallback;
  };

  const fetchSection = useCallback(
    async (
      url: string,
      setter: (state: DiscoverySectionState) => void,
      fallback: string,
    ) => {
      setter({ results: [], loading: true, error: null });
      try {
        const response = await apiFetch(url);
        if (!response.ok) {
          throw new Error(await resolveError(response, fallback));
        }
        const data = (await response.json()) as MediaSearchResponse;
        setter({ results: data.results, loading: false, error: null });
      } catch (error) {
        setter({
          results: [],
          loading: false,
          error: error instanceof Error ? error.message : tErrors("somethingWentWrong"),
        });
      }
    },
    [apiFetch, tErrors],
  );

  const loadAll = useCallback(() => {
    void fetchSection(`${API_BASE_URL}/api/media/trending?page=1`, setTrending, tErrors("trendingFailed") ?? "");
    void fetchSection(`${API_BASE_URL}/api/media/popular?mediaType=movie&page=1`, setPopularMovies, tErrors("requestFailed"));
    void fetchSection(`${API_BASE_URL}/api/media/popular?mediaType=tv&page=1`, setPopularTv, tErrors("requestFailed"));
  }, [fetchSection, tErrors]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <>
      <AppHeader />
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Discover
            </h1>
            <p className="mt-2 text-sm text-muted">{tHome("tagline")}</p>
          </div>
        </div>

      <DiscoverySection
        title="Trending Now"
        icon={<TrendingUp className="h-4 w-4 text-accent" />}
        state={trending}
        onRetry={() => fetchSection(`${API_BASE_URL}/api/media/trending?page=1`, setTrending, tErrors("trendingFailed") ?? "")}
        onSelect={setSelectedResult}

      />
      <DiscoverySection
        title="Popular Movies"
        icon={<Film className="h-4 w-4 text-accent" />}
        state={popularMovies}
        onRetry={() => fetchSection(`${API_BASE_URL}/api/media/popular?mediaType=movie&page=1`, setPopularMovies, tErrors("requestFailed"))}
        onSelect={setSelectedResult}

      />
      <DiscoverySection
        title="Popular TV Series"
        icon={<Tv className="h-4 w-4 text-accent" />}
        state={popularTv}
        onRetry={() => fetchSection(`${API_BASE_URL}/api/media/popular?mediaType=tv&page=1`, setPopularTv, tErrors("requestFailed"))}
        onSelect={setSelectedResult}

      />

      <AddMediaModal
        open={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        onAdded={() => {}}
        initialResult={selectedResult}
      />
    </main>
    </>
  );
}

function DiscoverySection({
  title,
  icon,
  state,
  onRetry,
  onSelect,
}: {
  title: string;
  icon: React.ReactNode;
  state: DiscoverySectionState;
  onRetry: () => void;
  onSelect: (result: MediaSearchResult) => void;
}) {
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-semibold text-primary">{title}</h2>
      </div>

      {state.loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <p className="text-sm">{tCommon("loading")}</p>
        </div>
      ) : state.error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-400">{state.error}</p>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : state.results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">{tErrors("requestFailed")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {state.results.map((result) => (
            <button
              key={`${result.provider}-${result.id}`}
              type="button"
              onClick={() => onSelect(result)}
              className="group text-left"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-border bg-canvas transition-colors group-hover:border-accent/50 group-focus-within:border-accent/50">
                {result.posterPath ? (
                  <Image
                    src={`${IMAGE_BASE}${result.posterPath}`}
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
                <div className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-semibold text-rating backdrop-blur-sm">
                  {result.voteAverage.toFixed(1)}
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-end rounded-xl bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">
                  <p className="line-clamp-2 w-full px-3 pb-3 text-lg font-semibold leading-tight text-white">
                    {result.title}
                  </p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-sm font-medium text-primary">
                {result.title}
              </p>
              <p className="text-xs text-muted">
                {result.year ?? ""} ·{" "}
                {result.mediaType === "movie" ? "Movie" : "TV"}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

