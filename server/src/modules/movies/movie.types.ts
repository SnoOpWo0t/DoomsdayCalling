export type TitleKind = 'movie' | 'series';

/**
 * A title in the catalogue: a movie or a series. The API keeps the brief's
 * "movie" naming; `kind` distinguishes the two.
 */
export interface Movie {
  id: number;
  kind: TitleKind;
  title: string;
  releaseYear: number;
  /** Runtime of a movie, or the typical episode length of a series. */
  runtimeMinutes: number;
  /** Always 1 for movies. */
  episodeCount: number;
  watched: boolean;
  /** Optional link to The Movie Database. */
  tmdbId: number | null;
  /** TMDb poster file path (e.g. "/abc.jpg"); the client chooses the image size. */
  posterPath: string | null;
  /** Small poster found automatically (TMDb, TVMaze or Wikipedia); null until looked up. */
  posterUrl: string | null;
  /** Ids of the movies to watch before this one. */
  prerequisiteIds: number[];
  /** Guest id of whoever added it; internal, never sent to clients. */
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MovieSummary {
  id: number;
  title: string;
}

export interface RewatchPlan {
  target: Movie;
  /** Movies to watch before the target, each after its own prerequisites. */
  movies: Movie[];
  totalCount: number;
  watchedCount: number;
  /** Total watch time (runtime x episodes) of the titles in `movies` not yet watched. */
  unwatchedRuntimeMinutes: number;
}

/** A title as sent to a client: owner hidden, permissions for the caller added. */
export type MovieDto = Omit<Movie, 'createdBy'> & {
  /** The caller may edit details and delete this title. */
  canEdit: boolean;
  /** The caller's guest id added this title. */
  addedByYou: boolean;
};
