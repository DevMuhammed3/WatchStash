import type { MediaDetails, MediaSearchResponse, MediaSearchResult, ProviderId } from '@watchstash/types';
import { cacheWrap } from '../config/upstash.js';
import { AppError } from '../utils/AppError.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Upstream calls must not hold an API request open indefinitely. One retry is
// enough to ride out a transient blip; more would multiply latency under an
// outage.
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const RETRY_BACKOFF_MS = 250;

function requestTimeoutMs(): number {
  const configured = Number(process.env.TMDB_REQUEST_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_REQUEST_TIMEOUT_MS;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableFetchError(error: unknown): boolean {
  // AbortError = our timeout fired; TypeError = fetch network failure.
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError');
}

export class TmdbRequestError extends AppError {
  constructor(
    message: string,
    public readonly upstreamStatus: number,
    headers?: Record<string, string>,
  ) {
    // 429 is a temporary upstream throttle, so surface it as "service
    // unavailable" with a Retry-After header rather than a generic 502.
    super(message, upstreamStatus === 429 ? 503 : 502, true, headers);
  }
}

async function fetchWithTimeout(
  url: URL,
  headers: Record<string, string>,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs());
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Seconds. TMDB refreshes trending and metadata daily, so those entries mirror
// the upstream cadence; search reflects live user intent and stays short.
const TTL = {
  search: 60 * 60,
  trending: 24 * 60 * 60,
  popular: 24 * 60 * 60,
  details: 24 * 60 * 60,
  genres: 24 * 60 * 60,
};

function assertConfigured() {
  const apiKey = process.env.TMDB_API_KEY;
  const accessToken = process.env.TMDB_ACCESS_TOKEN;
  if (!apiKey && !accessToken) {
    throw new AppError(
      'TMDB is not configured. Set TMDB_API_KEY or TMDB_ACCESS_TOKEN in your environment (apps/backend/.env).',
      500,
      false,
    );
  }
  return { apiKey, accessToken };
}

async function tmdbFetch<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
): Promise<T> {
  const { apiKey, accessToken } = assertConfigured();
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('language', 'en-US');
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  if (apiKey) url.searchParams.set('api_key', apiKey);

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    let response: Response;

    try {
      response = await fetchWithTimeout(url, headers);
    } catch (error) {
      if (attempt === 0 && isRetryableFetchError(error)) {
        await delay(RETRY_BACKOFF_MS);
        continue;
      }
      throw new TmdbRequestError('Upstream TMDB request failed (network)', 0);
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after') ?? '60';
      throw new TmdbRequestError('Upstream TMDB rate limit exceeded', 429, {
        'Retry-After': retryAfter,
      });
    }

    // One retry for a transient upstream failure. Client errors (4xx) are
    // deterministic, so retrying them only adds latency.
    if (response.status >= 500 && attempt === 0) {
      await delay(RETRY_BACKOFF_MS);
      continue;
    }

    throw new TmdbRequestError(
      `Upstream TMDB request failed (${response.status})`,
      response.status,
    );
  }

  // Unreachable: the loop either returns or throws.
  throw new TmdbRequestError('Upstream TMDB request failed (network)', 0);
}

interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbListCard {
  id: number;
  title?: string;
  name?: string;
  media_type?: 'movie' | 'tv' | 'person';
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
}

interface TmdbDetails {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  backdrop_path?: string | null;
  poster_path?: string | null;
  genres?: TmdbGenre[];
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  vote_count?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
}

function yearFrom(date?: string): number | null {
  if (!date) return null;
  const year = parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

function toMediaType(mediaType: string | undefined): 'movie' | 'tv' | null {
  if (mediaType === 'movie' || mediaType === 'tv') return mediaType;
  return null;
}

function normalizeListCard(
  item: TmdbListCard,
  movieGenres: Map<number, string>,
  tvGenres: Map<number, string>,
  defaultMediaType?: 'movie' | 'tv',
): MediaSearchResult | null {
  const mediaType = toMediaType(item.media_type ?? defaultMediaType);
  if (!mediaType) return null;

  const genreLookup = mediaType === 'tv' ? tvGenres : movieGenres;
  const genres = (item.genre_ids ?? [])
    .map((id) => genreLookup.get(id))
    .filter((name): name is string => Boolean(name));

  return {
    provider: 'tmdb',
    id: String(item.id),
    mediaType,
    title: item.title ?? item.name ?? '',
    overview: item.overview ?? '',
    posterPath: item.poster_path ?? null,
    backdropPath: item.backdrop_path ?? null,
    year: yearFrom(mediaType === 'tv' ? item.first_air_date : item.release_date),
    genres,
    voteAverage: item.vote_average ?? 0,
    voteCount: item.vote_count ?? 0,
  };
}

function normalizeDetails(details: TmdbDetails, mediaType: 'movie' | 'tv'): MediaDetails {
  return {
    provider: 'tmdb',
    id: String(details.id),
    mediaType,
    title: (mediaType === 'tv' ? details.name : details.title) ?? details.name ?? details.title ?? '',
    overview: details.overview ?? '',
    posterPath: details.poster_path ?? null,
    backdropPath: details.backdrop_path ?? null,
    year: yearFrom(mediaType === 'tv' ? details.first_air_date : details.release_date),
    genres: (details.genres ?? []).map((genre) => genre.name),
    voteAverage: details.vote_average ?? 0,
    voteCount: details.vote_count ?? 0,
    seasons: mediaType === 'tv' ? details.number_of_seasons : undefined,
    episodes: mediaType === 'tv' ? details.number_of_episodes : undefined,
  };
}

async function genreMap(type: 'movie' | 'tv'): Promise<Map<number, string>> {
  const data = await cacheWrap(
    `media:genres:${type}`,
    () => tmdbFetch<{ genres: TmdbGenre[] }>(`/genre/${type}/list`),
    TTL.genres,
  );
  return new Map(data.genres.map((genre) => [genre.id, genre.name]));
}

async function listPage(
  key: string,
  fetchPage: () => Promise<TmdbPage<TmdbListCard>>,
  defaultMediaType?: 'movie' | 'tv',
): Promise<MediaSearchResponse> {
  return cacheWrap(
    key,
    async () => {
      const [page, movieGenres, tvGenres] = await Promise.all([fetchPage(), genreMap('movie'), genreMap('tv')]);
      const results = page.results
        .map((item) => normalizeListCard(item, movieGenres, tvGenres, defaultMediaType))
        .filter((item): item is MediaSearchResult => item !== null);
      return {
        page: page.page,
        totalPages: page.total_pages,
        totalResults: page.total_results,
        results,
      };
    },
    TTL.search,
  );
}

export interface MediaProvider {
  readonly id: ProviderId;
  search(query: string, page?: number): Promise<MediaSearchResponse>;
  trending(page?: number): Promise<MediaSearchResponse>;
  popular(mediaType: 'movie' | 'tv', page?: number): Promise<MediaSearchResponse>;
  details(externalId: string, type?: 'movie' | 'tv'): Promise<MediaDetails>;
  imageUrl(path: string | null, size?: string): string | null;
}

export const tmdbProvider: MediaProvider = {
  id: 'tmdb',

  search(query, page = 1) {
    return listPage(`media:search:${query}:${page}`, () =>
      tmdbFetch<TmdbPage<TmdbListCard>>('/search/multi', { query, page }),
    );
  },

  trending(page = 1) {
    return listPage(`media:trending:${page}`, () =>
      tmdbFetch<TmdbPage<TmdbListCard>>('/trending/all/week', { page }),
    );
  },

  popular(mediaType: 'movie' | 'tv', page = 1) {
    const path = mediaType === 'movie' ? '/movie/popular' : '/tv/popular';
    return listPage(
      `media:popular:${mediaType}:${page}`,
      () => tmdbFetch<TmdbPage<TmdbListCard>>(path, { page }),
      mediaType,
    );
  },

  details(externalId, type) {
    return cacheWrap(
      `media:details:${type ?? 'any'}:${externalId}`,
      async () => {
        if (type) return normalizeDetails(await tmdbFetch<TmdbDetails>(`/${type}/${externalId}`), type);
        try {
          return normalizeDetails(await tmdbFetch<TmdbDetails>(`/movie/${externalId}`), 'movie');
        } catch (error) {
          // Only a genuine "not a movie" 404 justifies trying the TV
          // namespace. Retrying on 429/5xx/network errors would double the
          // upstream load and hide the real failure.
          if (error instanceof TmdbRequestError && error.upstreamStatus === 404) {
            return normalizeDetails(await tmdbFetch<TmdbDetails>(`/tv/${externalId}`), 'tv');
          }
          throw error;
        }
      },
      TTL.details,
    );
  },

  imageUrl(path, size = 'w500') {
    if (!path) return null;
    return `${IMAGE_BASE_URL}/${size}${path}`;
  },
};

export const providers: Record<ProviderId, MediaProvider> = {
  tmdb: tmdbProvider,
};

export function getProvider(id: ProviderId): MediaProvider {
  const provider = providers[id];
  if (!provider) {
    throw new AppError(`Unsupported media provider: ${id}`, 400);
  }
  return provider;
}