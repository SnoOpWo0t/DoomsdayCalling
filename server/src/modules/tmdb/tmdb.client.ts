import { AppError, ErrorCode } from '../../lib/errors.js';

/**
 * Thin client for The Movie Database (TMDb) API v3, used only to help users
 * fill in movie details and show posters. Nothing in Features 1 or 2 depends
 * on it.
 */

export interface TmdbMovie {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  overview: string;
}

export interface TmdbMovieDetails extends TmdbMovie {
  runtimeMinutes: number | null;
  genres: string[];
  /** Average user score out of 10, or null when there are too few votes. */
  rating: number | null;
  backdropPath: string | null;
}

export interface TmdbClient {
  search(query: string): Promise<TmdbMovie[]>;
  details(tmdbId: number): Promise<TmdbMovieDetails>;
}

interface RawMovie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  runtime?: number | null;
  genres?: Array<{ name: string }>;
  vote_average?: number;
  vote_count?: number;
  backdrop_path?: string | null;
}

export interface TmdbClientOptions {
  /** v3 API key or v4 Read Access Token. */
  apiKey: string;
  fetch?: typeof globalThis.fetch;
  baseUrl?: string;
  timeoutMs?: number;
  cacheTtlMs?: number;
  maxResults?: number;
}

const POSTER_PATH = /^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$/;

export function createTmdbClient({
  apiKey,
  fetch = globalThis.fetch,
  baseUrl = 'https://api.themoviedb.org/3',
  timeoutMs = 5000,
  cacheTtlMs = 10 * 60 * 1000,
  maxResults = 8,
}: TmdbClientOptions): TmdbClient {
  // v4 Read Access Tokens are JWTs (three dot-separated parts); v3 keys are 32 hex characters.
  const isBearerToken = apiKey.split('.').length === 3;
  const cache = new Map<string, { expiresAt: number; value: unknown }>();

  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (!isBearerToken) url.searchParams.set('api_key', apiKey);

    const cacheKey = `${path}?${new URLSearchParams(params).toString()}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value as T;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          ...(isBearerToken ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw unavailable('TMDb could not be reached.', error);
    }

    if (response.status === 404) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'That movie was not found on TMDb.');
    }
    if (!response.ok) {
      throw unavailable(`TMDb responded with status ${response.status}.`);
    }

    const value = (await response.json()) as T;
    // Keep the cache bounded: drop the oldest entry once it grows large.
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, value });
    return value;
  }

  return {
    async search(query) {
      const data = await get<{ results: RawMovie[] }>('/search/movie', {
        query,
        include_adult: 'false',
        language: 'en-US',
        page: '1',
      });
      return data.results.slice(0, maxResults).map(toMovie);
    },

    async details(tmdbId) {
      const raw = await get<RawMovie>(`/movie/${tmdbId}`, { language: 'en-US' });
      return {
        ...toMovie(raw),
        runtimeMinutes: raw.runtime && raw.runtime > 0 ? raw.runtime : null,
        genres: (raw.genres ?? []).map((genre) => genre.name),
        rating:
          raw.vote_average && (raw.vote_count ?? 0) >= 10
            ? Math.round(raw.vote_average * 10) / 10
            : null,
        backdropPath:
          raw.backdrop_path && POSTER_PATH.test(raw.backdrop_path) ? raw.backdrop_path : null,
      };
    },
  };
}

function toMovie(raw: RawMovie): TmdbMovie {
  const year = raw.release_date ? Number.parseInt(raw.release_date.slice(0, 4), 10) : NaN;
  return {
    tmdbId: raw.id,
    title: raw.title,
    releaseYear: Number.isNaN(year) ? null : year,
    // Only pass through paths in the expected shape; anything else is dropped.
    posterPath: raw.poster_path && POSTER_PATH.test(raw.poster_path) ? raw.poster_path : null,
    overview: raw.overview ?? '',
  };
}

function unavailable(message: string, cause?: unknown): AppError {
  return new AppError(502, ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE, message, undefined, cause);
}
