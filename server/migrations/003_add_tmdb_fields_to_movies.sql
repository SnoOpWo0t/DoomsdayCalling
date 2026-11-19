-- Optional link to The Movie Database (TMDb) for posters and metadata lookup.

ALTER TABLE movies
  ADD COLUMN tmdb_id     INTEGER CHECK (tmdb_id > 0),
  -- TMDb image file path such as "/abc123.jpg"; the client picks the image size.
  ADD COLUMN poster_path TEXT    CHECK (poster_path ~ '^/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$');
