-- Cinemas and the seat bundle sizes they sell for opening night.

CREATE TABLE cinemas (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Names are unique regardless of letter case.
CREATE UNIQUE INDEX cinemas_name_unique ON cinemas (lower(name));

-- One row per bundle size a cinema sells; the primary key keeps sizes distinct.
-- The 1-10 sizes-per-cinema rule is enforced by the API.
CREATE TABLE cinema_bundle_sizes (
  cinema_id INTEGER NOT NULL REFERENCES cinemas (id) ON DELETE CASCADE,
  seats     INTEGER NOT NULL CHECK (seats BETWEEN 1 AND 500),
  PRIMARY KEY (cinema_id, seats)
);
