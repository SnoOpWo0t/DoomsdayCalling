import type { Movie } from '../movies/movie.types.js';

export type MetadataSource = 'tmdb' | 'tvmaze' | 'wikipedia';

/** Details about a title from an external source, used for display only. */
export interface TitleMetadata {
  source: MetadataSource;
  /** Small poster for lists (roughly 200-350px wide). */
  posterUrl: string | null;
  /** Large poster for the details page. */
  posterLargeUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  genres: string[];
  /** Score out of 10. */
  rating: number | null;
  /** Page on the source site, shown as attribution. */
  externalUrl: string | null;
}

/** What a provider needs to identify a title. */
export type TitleQuery = Pick<Movie, 'kind' | 'title' | 'releaseYear' | 'tmdbId'>;

/**
 * One external source. `lookup` resolves to null when the source has no
 * confident match, and throws when the source could not be reached (so the
 * caller knows not to cache a "not found").
 */
export interface MetadataProvider {
  readonly name: MetadataSource;
  lookup(title: TitleQuery): Promise<TitleMetadata | null>;
}
