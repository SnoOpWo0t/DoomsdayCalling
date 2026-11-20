import type { Db } from '../../db/pool.js';
import { runInBackground } from '../../lib/background.js';
import { findMovieById } from '../movies/movie.repository.js';
import type { Movie } from '../movies/movie.types.js';
import * as repo from './metadata.repository.js';
import type { MetadataProvider, TitleMetadata } from './metadata.types.js';

type Log = (message: string) => void;

/**
 * Looks up posters and details for titles, trying providers in order and
 * caching the first match in `title_metadata`. Display-only: nothing in the
 * rewatch or booking logic depends on it, and failures never break a request.
 */
export function createMetadataService(
  db: Db,
  providers: readonly MetadataProvider[],
  log: Log = (message) => console.warn(message),
) {
  // One lookup per title at a time, however many requests ask for it.
  const inFlight = new Map<number, Promise<TitleMetadata | null>>();

  async function lookup(movie: Movie): Promise<TitleMetadata | null> {
    let unreachable = false;
    for (const provider of providers) {
      try {
        const found = await provider.lookup(movie);
        if (found) {
          await repo.saveCached(db, movie.id, found);
          return found;
        }
      } catch (error) {
        unreachable = true;
        log(
          `Metadata lookup via ${provider.name} failed for "${movie.title}": ${(error as Error).message}`,
        );
      }
    }
    // Only remember "not found" when every source actually answered,
    // so a temporary outage is retried later.
    if (!unreachable) await repo.saveCached(db, movie.id, null);
    return null;
  }

  const service = {
    enabled: providers.length > 0,

    /** Cached metadata, looking it up first if this title has never been checked. */
    async get(movie: Movie): Promise<TitleMetadata | null> {
      const cached = await repo.findCached(db, movie.id);
      if (cached) return cached.metadata;
      if (providers.length === 0) return null;

      let pending = inFlight.get(movie.id);
      if (!pending) {
        pending = lookup(movie).finally(() => inFlight.delete(movie.id));
        inFlight.set(movie.id, pending);
      }
      return pending;
    },

    /** Forgets cached details (e.g. after a rename) and fetches fresh ones in the background. */
    refreshInBackground(movie: Movie): void {
      if (providers.length === 0) return;
      runInBackground(
        repo
          .clearCached(db, movie.id)
          .then(() => service.get(movie))
          .catch((error: Error) => log(`Metadata refresh failed: ${error.message}`)),
      );
    },

    /**
     * Looks up every title that has never been checked, one at a time with a
     * short pause, to stay well inside the public APIs' rate limits.
     */
    async backfill(pauseMs = 400): Promise<number> {
      if (providers.length === 0) return 0;
      let found = 0;
      for (const id of await repo.findUnfetchedIds(db)) {
        const movie = await findMovieById(db, id);
        if (movie && (await service.get(movie))) found += 1;
        if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
      return found;
    },
  };

  return service;
}

export type MetadataService = ReturnType<typeof createMetadataService>;
