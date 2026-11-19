export interface Movie {
  id: number;
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
  watched: boolean;
  /** Ids of the movies to watch before this one. */
  prerequisiteIds: number[];
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
  /** Total runtime of the movies in `movies` that are not yet watched. */
  unwatchedRuntimeMinutes: number;
}
