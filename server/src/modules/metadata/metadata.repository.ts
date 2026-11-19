import type { Queryable } from '../../db/pool.js';
import type { TitleMetadata } from './metadata.types.js';

export interface CachedMetadata {
  /** null when a lookup ran and found nothing. */
  metadata: TitleMetadata | null;
}

interface Row {
  source: TitleMetadata['source'] | null;
  posterUrl: string | null;
  posterLargeUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  genres: string[];
  rating: string | null;
  externalUrl: string | null;
}

/** Returns undefined when the title has never been looked up. */
export async function findCached(
  db: Queryable,
  movieId: number,
): Promise<CachedMetadata | undefined> {
  const { rows } = await db.query<Row>(
    `SELECT source,
            poster_url       AS "posterUrl",
            poster_large_url AS "posterLargeUrl",
            backdrop_url     AS "backdropUrl",
            overview,
            genres,
            rating,
            external_url     AS "externalUrl"
       FROM title_metadata
      WHERE movie_id = $1`,
    [movieId],
  );
  const row = rows[0];
  if (!row) return undefined;
  if (!row.source) return { metadata: null };
  return {
    metadata: {
      ...row,
      source: row.source,
      // NUMERIC arrives as a string from pg.
      rating: row.rating === null ? null : Number(row.rating),
    },
  };
}

/** Stores a lookup result; `null` records that nothing was found. */
export async function saveCached(
  db: Queryable,
  movieId: number,
  metadata: TitleMetadata | null,
): Promise<void> {
  await db.query(
    `INSERT INTO title_metadata
       (movie_id, source, poster_url, poster_large_url, backdrop_url, overview, genres, rating, external_url, fetched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     ON CONFLICT (movie_id) DO UPDATE SET
       source = EXCLUDED.source,
       poster_url = EXCLUDED.poster_url,
       poster_large_url = EXCLUDED.poster_large_url,
       backdrop_url = EXCLUDED.backdrop_url,
       overview = EXCLUDED.overview,
       genres = EXCLUDED.genres,
       rating = EXCLUDED.rating,
       external_url = EXCLUDED.external_url,
       fetched_at = now()`,
    [
      movieId,
      metadata?.source ?? null,
      metadata?.posterUrl ?? null,
      metadata?.posterLargeUrl ?? null,
      metadata?.backdropUrl ?? null,
      metadata?.overview ?? null,
      metadata?.genres ?? [],
      metadata?.rating ?? null,
      metadata?.externalUrl ?? null,
    ],
  );
}

export async function clearCached(db: Queryable, movieId: number): Promise<void> {
  await db.query('DELETE FROM title_metadata WHERE movie_id = $1', [movieId]);
}

/** Ids of titles that have never been looked up. */
export async function findUnfetchedIds(db: Queryable): Promise<number[]> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT m.id
       FROM movies m
       LEFT JOIN title_metadata md ON md.movie_id = m.id
      WHERE md.movie_id IS NULL
      ORDER BY m.release_year, m.id`,
  );
  return rows.map((row) => row.id);
}
