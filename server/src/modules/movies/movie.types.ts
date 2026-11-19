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
