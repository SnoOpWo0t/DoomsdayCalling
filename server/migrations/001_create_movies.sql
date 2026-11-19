-- Movies and the prerequisite relation between them.

CREATE TABLE movies (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title           TEXT        NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  release_year    INTEGER     NOT NULL CHECK (release_year BETWEEN 1888 AND 2100),
  runtime_minutes INTEGER     NOT NULL CHECK (runtime_minutes BETWEEN 1 AND 300),
  watched         BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Titles are unique regardless of letter case ("Iron Man" and "iron man" are the same film).
CREATE UNIQUE INDEX movies_title_unique ON movies (lower(title));

-- Each row means: watch `prerequisite_id` before `movie_id`.
CREATE TABLE movie_prerequisites (
  movie_id        INTEGER NOT NULL REFERENCES movies (id) ON DELETE CASCADE,
  prerequisite_id INTEGER NOT NULL REFERENCES movies (id) ON DELETE CASCADE,
  PRIMARY KEY (movie_id, prerequisite_id),
  -- Direct self-dependency is impossible at the storage level; indirect cycles
  -- are rejected by the application before any edge is written.
  CONSTRAINT movie_prerequisites_no_self CHECK (movie_id <> prerequisite_id)
);

-- Supports "which movies depend on X" lookups and cascading deletes.
CREATE INDEX movie_prerequisites_prerequisite_idx ON movie_prerequisites (prerequisite_id);
