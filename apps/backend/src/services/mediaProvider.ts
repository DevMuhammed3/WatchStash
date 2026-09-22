import type { MediaDetails, MediaSearchResponse, MediaSearchResult, ProviderId } from '@watchstash/types';
import { cacheWrap } from '../config/upstash.js';
import { AppError } from '../utils/AppError.js';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

const TTL = {
  search: 60 * 60,
  trending: 60 * 60,
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

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new AppError(`Upstream TMDB request failed (${response.status})`, 502);
  }
  return (await response.json()) as T;
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
): MediaSearchResult | null {
  const mediaType = toMediaType(item.media_type);
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
): Promise<MediaSearchResponse> {
  return cacheWrap(
    key,
    async () => {
      const [page, movieGenres, tvGenres] = await Promise.all([fetchPage(), genreMap('movie'), genreMap('tv')]);
      const results = page.results
        .map((item) => normalizeListCard(item, movieGenres, tvGenres))
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

  details(externalId, type) {
    return cacheWrap(
      `media:details:${type ?? 'any'}:${externalId}`,
      async () => {
        if (type) return normalizeDetails(await tmdbFetch<TmdbDetails>(`/${type}/${externalId}`), type);
        try {
          return normalizeDetails(await tmdbFetch<TmdbDetails>(`/movie/${externalId}`), 'movie');
        } catch {
          return normalizeDetails(await tmdbFetch<TmdbDetails>(`/tv/${externalId}`), 'tv');
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