-- Opening-night watch party reservations. The bundles are computed by the
-- server from the cinema's bundle sizes at the time of booking and stored
-- as a snapshot, so later changes to the cinema do not alter a reservation.

CREATE TABLE reservations (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference     TEXT        NOT NULL UNIQUE,
  cinema_id     INTEGER     NOT NULL REFERENCES cinemas (id) ON DELETE CASCADE,
  name          TEXT        NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  group_size    INTEGER     NOT NULL CHECK (group_size BETWEEN 1 AND 10000),
  total_bundles INTEGER     NOT NULL CHECK (total_bundles >= 1),
  bundles       JSONB       NOT NULL,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX reservations_created_by_idx ON reservations (created_by);
