-- Cached details from external sources (TMDb, TVMaze, Wikipedia) for each
-- title: posters, overview, genres and rating. One row per title. A row with
-- every field empty records that nothing was found, so lookups are not
-- repeated on every request.

CREATE TABLE title_metadata (
  movie_id         INTEGER     PRIMARY KEY REFERENCES movies (id) ON DELETE CASCADE,
  source           TEXT        CHECK (source IN ('tmdb', 'tvmaze', 'wikipedia')),
  poster_url       TEXT,
  poster_large_url TEXT,
  backdrop_url     TEXT,
  overview         TEXT,
  genres           TEXT[]      NOT NULL DEFAULT '{}',
  rating           NUMERIC(3, 1) CHECK (rating BETWEEN 0 AND 10),
  external_url     TEXT,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
