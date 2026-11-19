import type { TmdbClient } from '../tmdb/tmdb.client.js';
import { closeYear, safeImageUrl, safeLinkUrl, sameTitle, stripHtml } from './matching.js';
import type { MetadataProvider, TitleMetadata, TitleQuery } from './metadata.types.js';

type Fetch = typeof globalThis.fetch;

/** Generic client name; no personal details are sent to external services. */
const USER_AGENT = 'DoomsdayCalling/1.0 (educational demo app)';
const TIMEOUT_MS = 6000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson<T>(fetch: Fetch, url: string, retries = 1): Promise<T | null> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Rate limited: wait as asked (at most 3 s) and try once more.
  if (response.status === 429 && retries > 0) {
    const retryAfter = Number(response.headers.get('retry-after'));
    await sleep(
      Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000, 3000),
    );
    return getJson<T>(fetch, url, retries - 1);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`);
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${new URL(url).hostname} returned a non-JSON response`);
  }
}

/* TMDb (only when a key is configured) ------------------------------------ */

const TMDB_IMAGES = 'https://image.tmdb.org/t/p';

/** Uses TMDb for movies when an API key is configured. Series fall through to TVMaze. */
export function createTmdbProvider(tmdb: TmdbClient): MetadataProvider {
  return {
    name: 'tmdb',
    async lookup(title) {
      if (title.kind !== 'movie') return null;

      let tmdbId = title.tmdbId;
      if (tmdbId === null) {
        const results = await tmdb.search(title.title);
        const match = results.find(
          (result) =>
            sameTitle(result.title, title.title) &&
            closeYear(result.releaseYear, title.releaseYear),
        );
        if (!match) return null;
        tmdbId = match.tmdbId;
      }

      const details = await tmdb.details(tmdbId);
      return {
        source: 'tmdb',
        posterUrl: details.posterPath ? `${TMDB_IMAGES}/w185${details.posterPath}` : null,
        posterLargeUrl: details.posterPath ? `${TMDB_IMAGES}/w500${details.posterPath}` : null,
        backdropUrl: details.backdropPath ? `${TMDB_IMAGES}/w1280${details.backdropPath}` : null,
        overview: details.overview || null,
        genres: details.genres,
        rating: details.rating,
        externalUrl: `https://www.themoviedb.org/movie/${tmdbId}`,
      };
    },
  };
}

/* TVMaze (series, no key needed) ------------------------------------------ */

interface TvmazeShow {
  name: string;
  premiered: string | null;
  genres: string[];
  rating: { average: number | null };
  image: { medium: string; original: string } | null;
  summary: string | null;
  url: string;
}

/** Series details from TVMaze, the same free API used by the Movie Explorer project. */
export function createTvmazeProvider(fetch: Fetch = globalThis.fetch): MetadataProvider {
  return {
    name: 'tvmaze',
    async lookup(title) {
      if (title.kind !== 'series') return null;

      const results = await getJson<Array<{ show: TvmazeShow }>>(
        fetch,
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(title.title)}`,
      );
      const show = results?.find(
        ({ show }) =>
          sameTitle(show.name, title.title) &&
          closeYear(show.premiered ? Number(show.premiered.slice(0, 4)) : null, title.releaseYear),
      )?.show;
      if (!show) return null;

      return {
        source: 'tvmaze',
        posterUrl: safeImageUrl(show.image?.medium),
        posterLargeUrl: safeImageUrl(show.image?.original),
        backdropUrl: null,
        overview: stripHtml(show.summary),
        genres: show.genres ?? [],
        rating: show.rating?.average ?? null,
        externalUrl: safeLinkUrl(show.url),
      };
    },
  };
}

/* Wikipedia (movies and series, no key needed) ---------------------------- */

interface WikiPage {
  title: string;
  index: number;
  description?: string;
  extract?: string;
  thumbnail?: { source: string };
  original?: { source: string };
  fullurl?: string;
  pageprops?: { disambiguation?: string };
}

/**
 * Finds the title's Wikipedia article ("Iron Man (2008 film)") and uses its
 * lead paragraph and infobox poster. A single request does the search and
 * fetches the extract, image and description together.
 */
export function createWikipediaProvider(fetch: Fetch = globalThis.fetch): MetadataProvider {
  return {
    name: 'wikipedia',
    async lookup(title: TitleQuery): Promise<TitleMetadata | null> {
      const kindWords = title.kind === 'series' ? 'television series' : 'film';
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        formatversion: '2',
        generator: 'search',
        gsrsearch: `${title.title} ${title.releaseYear} ${kindWords}`,
        gsrlimit: '5',
        prop: 'extracts|pageimages|description|info|pageprops',
        exintro: '1',
        explaintext: '1',
        exsentences: '5',
        piprop: 'thumbnail|original',
        // Film posters are non-free images; the default ('free') would skip them.
        pilicense: 'any',
        pithumbsize: '342',
        inprop: 'url',
        ppprop: 'disambiguation',
      });
      const data = await getJson<{ query?: { pages: WikiPage[] } }>(
        fetch,
        `https://en.wikipedia.org/w/api.php?${params}`,
      );

      const page = [...(data?.query?.pages ?? [])]
        .sort((a, b) => a.index - b.index)
        .find(
          (candidate) =>
            sameTitle(candidate.title, title.title) &&
            candidate.pageprops?.disambiguation === undefined &&
            // Only articles about a film or show, not the comic character of the same name.
            /film|series|television|miniseries/i.test(candidate.description ?? ''),
        );
      if (!page) return null;

      return {
        source: 'wikipedia',
        posterUrl: safeImageUrl(page.thumbnail?.source),
        posterLargeUrl: safeImageUrl(page.original?.source ?? page.thumbnail?.source),
        backdropUrl: null,
        overview: page.extract?.trim() || null,
        genres: [],
        rating: null,
        externalUrl: safeLinkUrl(page.fullurl),
      };
    },
  };
}
