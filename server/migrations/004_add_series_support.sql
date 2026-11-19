-- A title in the catalogue can be a movie or a series. Both live in the same
-- table so series and movies can be prerequisites of each other.

ALTER TABLE movies
  ADD COLUMN kind TEXT NOT NULL DEFAULT 'movie' CHECK (kind IN ('movie', 'series')),
  -- For a series, runtime_minutes is the typical episode length.
  ADD COLUMN episode_count INTEGER NOT NULL DEFAULT 1 CHECK (episode_count BETWEEN 1 AND 500),
  -- A movie is always a single "episode".
  ADD CONSTRAINT movies_movie_has_one_episode CHECK (kind = 'series' OR episode_count = 1);
