import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { tmdbProvider, getProvider, providers } from '../services/mediaProvider.js';
import { buildStashFields } from '../controllers/media.js';
import type { MediaDetails } from '@watchstash/types';
import { AppError } from '../utils/AppError.js';

type FetchStub = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const movieGenres = [
  { id: 28, name: 'Action' },
  { id: 878, name: 'Science Fiction' },
];
const tvGenres = [{ id: 10765, name: 'Sci-Fi & Fantasy' }, { id: 16, name: 'Animation' }];

const searchResponse = {
  page: 1,
  total_pages: 1,
  total_results: 3,
  results: [
    {
      id: 11,
      media_type: 'movie',
      title: 'Star Wars',
      release_date: '1977-05-25',
      overview: 'A long time ago in a galaxy far, far away...',
      backdrop_path: '/b.jpg',
      poster_path: '/p.jpg',
      genre_ids: [28, 878],
      vote_average: 8.2,
      vote_count: 15000,
    },
    {
      id: 1399,
      media_type: 'tv',
      name: 'Game of Thrones',
      first_air_date: '2011-04-17',
      overview: 'Seven noble families fight for control of the mythical land of Westeros.',
      poster_path: '/got.jpg',
      genre_ids: [10765],
      vote_average: 9.3,
      vote_count: 21000,
    },
    { id: 123, media_type: 'person', name: 'Mark Hamill', poster_path: '/mh.jpg' },
  ],
};

const starWarsMovie = {
  id: 11,
  title: 'Star Wars',
  release_date: '1977-05-25',
  overview: 'A long time ago in a galaxy far, far away...',
  backdrop_path: '/b.jpg',
  poster_path: '/p.jpg',
  genres: [{ id: 28, name: 'Action' }],
  vote_average: 8.2,
  vote_count: 15000,
};

const narutoTv = {
  id: 999,
  name: 'Naruto',
  first_air_date: '2002-10-03',
  overview: 'A young ninja seeks recognition.',
  poster_path: '/n.jpg',
  genres: [{ id: 16, name: 'Animation' }],
  vote_average: 8.5,
  vote_count: 9000,
  number_of_seasons: 9,
  number_of_episodes: 220,
};

let counts: Record<string, number> = {};
let queries: Record<string, URLSearchParams> = {};

const stub: FetchStub = async (input) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : String(input));
  const path = url.pathname.replace(/^\/3(?=\/)/, '');
  counts[path] = (counts[path] ?? 0) + 1;
  queries[path] = url.searchParams;

  const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200 });
  const notFound = () => new Response('Not found', { status: 404 });

  if (path === '/genre/movie/list') return json({ genres: movieGenres });
  if (path === '/genre/tv/list') return json({ genres: tvGenres });
  if (path === '/search/multi') return json(searchResponse);
  if (path === '/trending/all/week') return json({ page: 1, total_pages: 1, total_results: 1, results: [searchResponse.results[0]] });
  if (path === '/movie/999') return notFound();
  if (path.startsWith('/movie/')) return json(starWarsMovie);
  if (path.startsWith('/tv/')) return json(narutoTv);

  return notFound();
};

beforeAll(() => {
  process.env.TMDB_ACCESS_TOKEN = 'test_tmdb_token';
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  globalThis.fetch = stub as typeof fetch;
});

beforeEach(() => {
  counts = {};
  queries = {};
});

afterAll(() => {
  delete process.env.TMDB_ACCESS_TOKEN;
  delete process.env.TMDB_API_KEY;
});

describe('tmdbProvider.search', () => {
  test('normalizes movies and tv, filters people, resolves genre names', async () => {
    const response = await tmdbProvider.search('star');

    expect(response.page).toBe(1);
    expect(response.totalResults).toBe(3);
    expect(response.results).toHaveLength(2);

    const [movie, tv] = response.results;
    expect(movie).toMatchObject({
      provider: 'tmdb',
      id: '11',
      mediaType: 'movie',
      title: 'Star Wars',
      year: 1977,
      genres: ['Action', 'Science Fiction'],
    });
    expect(tv).toMatchObject({
      provider: 'tmdb',
      id: '1399',
      mediaType: 'tv',
      title: 'Game of Thrones',
      year: 2011,
      genres: ['Sci-Fi & Fantasy'],
    });
  });

  test('caches the page: a second identical search hits the API once', async () => {
    await tmdbProvider.search('caching-check');
    await tmdbProvider.search('caching-check');

    expect(counts['/search/multi']).toBe(1);
    expect(counts['/genre/movie/list'] ?? 0).toBeLessThan(2);
  });
});

describe('tmdbProvider.details', () => {
  test('normalizes a movie details payload', async () => {
    const details = await tmdbProvider.details('11');

    expect(details).toMatchObject({
      provider: 'tmdb',
      id: '11',
      mediaType: 'movie',
      title: 'Star Wars',
      year: 1977,
      genres: ['Action'],
      posterPath: '/p.jpg',
    });
    expect(details.seasons).toBeUndefined();
    expect(details.episodes).toBeUndefined();
  });

  test('falls back to tv when the movie fetch fails', async () => {
    const details = await tmdbProvider.details('999');

    expect(details).toMatchObject({
      provider: 'tmdb',
      id: '999',
      mediaType: 'tv',
      title: 'Naruto',
      year: 2002,
      genres: ['Animation'],
      seasons: 9,
      episodes: 220,
    });
  });

  test('caches details across calls', async () => {
    await tmdbProvider.details('77');
    await tmdbProvider.details('77');
    expect(counts['/movie/77']).toBe(1);
  });

  test('keeps movie and tv variants of the same id separate in cache', async () => {
    const movie = await tmdbProvider.details('77', 'movie');
    const tv = await tmdbProvider.details('77', 'tv');

    expect(movie.title).toBe('Star Wars');
    expect(tv.title).toBe('Naruto');
    expect(counts['/movie/77']).toBe(1);
    expect(counts['/tv/77']).toBe(1);
  });

  test('uses the explicit type and never falls back to the other namespace', async () => {
    const tv = await tmdbProvider.details('999', 'tv');

    expect(tv).toMatchObject({ title: 'Naruto', mediaType: 'tv' });
    expect(counts['/tv/999']).toBe(1);
    expect(counts['/movie/999']).toBeUndefined();
  });
});

describe('tmdbProvider.imageUrl', () => {
  test('builds full image URLs with a default size', () => {
    expect(tmdbProvider.imageUrl('/p.jpg')).toBe('https://image.tmdb.org/t/p/w500/p.jpg');
    expect(tmdbProvider.imageUrl('/b.jpg', 'w1280')).toBe('https://image.tmdb.org/t/p/w1280/b.jpg');
  });

  test('returns null for missing paths', () => {
    expect(tmdbProvider.imageUrl(null)).toBeNull();
    expect(tmdbProvider.imageUrl('')).toBeNull();
  });
});

describe('TMDB_API_KEY auth', () => {
  beforeAll(() => {
    delete process.env.TMDB_ACCESS_TOKEN;
    process.env.TMDB_API_KEY = 'test_v3_key';
  });

  afterAll(() => {
    delete process.env.TMDB_API_KEY;
    process.env.TMDB_ACCESS_TOKEN = 'test_tmdb_token';
  });

  test('sends the v3 key as api_key query param when no v4 token is set', async () => {
    await tmdbProvider.details('41');

    expect(queries['/movie/41']?.get('api_key')).toBe('test_v3_key');
  });
});

describe('getProvider', () => {
  test('returns the tmdb provider', () => {
    expect(getProvider('tmdb')).toBe(tmdbProvider);
    expect(providers.tmdb.id).toBe('tmdb');
  });

  test('throws for unknown providers', () => {
    const lookup = getProvider as (id: string) => unknown;
    expect(() => lookup('nope')).toThrow(AppError);
    expect(() => lookup('nope')).toThrow('Unsupported media provider');
  });
});

describe('buildStashFields', () => {
  const imageUrl = (path: string | null, size = 'w500') =>
    path ? `https://img.example/${size}${path}` : null;

  test('maps a movie details payload', () => {
    const details: MediaDetails = {
      provider: 'tmdb',
      id: '11',
      mediaType: 'movie',
      title: 'Star Wars',
      overview: 'A long time ago...',
      posterPath: '/p.jpg',
      backdropPath: '/b.jpg',
      year: 1977,
      genres: ['Action'],
      voteAverage: 8.2,
      voteCount: 15000,
    };

    const fields = buildStashFields(details, 'movie', undefined, imageUrl);

    expect(fields).toMatchObject({
      title: 'Star Wars',
      type: 'movie',
      posterUrl: 'https://img.example/w500/p.jpg',
      backdropUrl: 'https://img.example/w1280/b.jpg',
      overview: 'A long time ago...',
      year: 1977,
      genres: ['Action'],
      tmdbRating: 8.2,
      tmdbVoteCount: 15000,
      progress: { currentEpisode: 0, currentSeason: 1, totalEpisodes: undefined },
    });
  });

  test('uses provided season number and provider episode count for series', () => {
    const details: MediaDetails = {
      provider: 'tmdb',
      id: '999',
      mediaType: 'tv',
      title: 'Naruto',
      overview: '',
      posterPath: null,
      backdropPath: null,
      year: 2002,
      genres: ['Animation'],
      voteAverage: 8.5,
      voteCount: 9000,
      seasons: 9,
      episodes: 220,
    };

    const fields = buildStashFields(details, 'series', { currentEpisode: 0, currentSeason: 3 }, imageUrl);

    expect(fields.progress).toEqual({ currentEpisode: 0, currentSeason: 3, totalEpisodes: 220 });
  });

  test('falls back to the provided episode total when details omit it', () => {
    const details: MediaDetails = {
      provider: 'tmdb',
      id: '999',
      mediaType: 'tv',
      title: 'Frieren',
      overview: '',
      posterPath: null,
      backdropPath: null,
      year: null,
      genres: ['Animation'],
      voteAverage: 8.9,
      voteCount: 100,
    };

    const fields = buildStashFields(details, 'anime', { currentEpisode: 0, currentSeason: 1, totalEpisodes: 24 }, imageUrl);

    expect(fields.progress).toEqual({ currentEpisode: 0, currentSeason: 1, totalEpisodes: 24 });
    expect(fields.year).toBeUndefined();
  });
});