/** Shapes returned by the Doomsday Calling API. Dates arrive as ISO strings. */

export type TitleKind = 'movie' | 'series';

/** A title in the catalogue: a movie or a series (the API keeps the brief's "movie" naming). */
export interface Movie {
  id: number;
  kind: TitleKind;
  title: string;
  releaseYear: number;
  /** Movie runtime, or typical episode length for a series. */
  runtimeMinutes: number;
  /** Always 1 for movies. */
  episodeCount: number;
  watched: boolean;
  tmdbId: number | null;
  posterPath: string | null;
  prerequisiteIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface MovieInput {
  kind?: TitleKind;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  episodeCount?: number;
  watched?: boolean;
  tmdbId?: number | null;
  posterPath?: string | null;
  prerequisiteIds?: number[];
}

export type MoviePatch = Partial<MovieInput>;

export interface RewatchPlan {
  target: Movie;
  movies: Movie[];
  totalCount: number;
  watchedCount: number;
  unwatchedRuntimeMinutes: number;
}

export interface Cinema {
  id: number;
  name: string;
  bundleSizes: number[];
  createdAt: string;
  updatedAt: string;
}

export interface CinemaInput {
  name: string;
  bundleSizes: number[];
}

export interface BundlePurchase {
  size: number;
  count: number;
}

export interface BookingQuote {
  cinema: Pick<Cinema, 'id' | 'name' | 'bundleSizes'>;
  groupSize: number;
  possible: boolean;
  totalBundles: number | null;
  bundles: BundlePurchase[];
}

export interface TmdbMovie {
  tmdbId: number;
  title: string;
  releaseYear: number | null;
  posterPath: string | null;
  overview: string;
}

export interface TmdbMovieDetails extends TmdbMovie {
  runtimeMinutes: number | null;
}

export interface CycleStep {
  id: number;
  title: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
