import type { Queryable } from '../../db/pool.js';
import type { PrerequisiteGraph } from './dependency-graph.js';
import type { Movie, MovieSummary } from './movie.types.js';

/** Name of the unique index on lower(title); used to map violations to 409s. */
export const TITLE_UNIQUE_INDEX = 'movies_title_unique';

const SELECT_MOVIE = `
  SELECT m.id,
         m.title,
         m.release_year    AS "releaseYear",
         m.runtime_minutes AS "runtimeMinutes",
         m.watched,
         COALESCE(
           (SELECT array_agg(p.prerequisite_id ORDER BY p.prerequisite_id)
              FROM movie_prerequisites p
             WHERE p.movie_id = m.id),
           '{}'
         )                 AS "prerequisiteIds",
         m.created_at      AS "createdAt",
         m.updated_at      AS "updatedAt"
    FROM movies m
`;

export async function listMovies(db: Queryable): Promise<Movie[]> {
  const { rows } = await db.query<Movie>(`${SELECT_MOVIE} ORDER BY m.release_year, m.title`);
  return rows;
}

export async function findMovieById(db: Queryable, id: number): Promise<Movie | undefined> {
  const { rows } = await db.query<Movie>(`${SELECT_MOVIE} WHERE m.id = $1`, [id]);
  return rows[0];
}

/** Returns which of the given ids exist (used to validate prerequisite lists). */
export async function findExistingIds(db: Queryable, ids: readonly number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { rows } = await db.query<{ id: number }>(
    'SELECT id FROM movies WHERE id = ANY($1::int[])',
    [ids],
  );
  return new Set(rows.map((row) => row.id));
}

export async function findSummaries(
  db: Queryable,
  ids: readonly number[],
): Promise<Map<number, MovieSummary>> {
  const { rows } = await db.query<MovieSummary>(
    'SELECT id, title FROM movies WHERE id = ANY($1::int[])',
    [ids],
  );
  return new Map(rows.map((row) => [row.id, row]));
}

export async function insertMovie(
  db: Queryable,
  movie: Pick<Movie, 'title' | 'releaseYear' | 'runtimeMinutes' | 'watched'>,
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO movies (title, release_year, runtime_minutes, watched)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [movie.title, movie.releaseYear, movie.runtimeMinutes, movie.watched],
  );
  return rows[0]!.id;
}

/** Maps API field names to columns. Only these columns can ever be updated. */
const UPDATABLE_COLUMNS = {
  title: 'title',
  releaseYear: 'release_year',
  runtimeMinutes: 'runtime_minutes',
  watched: 'watched',
} as const;

export type MovieFieldUpdate = Partial<Pick<Movie, keyof typeof UPDATABLE_COLUMNS>>;

export async function updateMovieFields(
  db: Queryable,
  id: number,
  fields: MovieFieldUpdate,
): Promise<void> {
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = fields[field as keyof MovieFieldUpdate];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  values.push(id);
  // Always bump updated_at, even when only prerequisites changed.
  await db.query(
    `UPDATE movies
        SET ${[...assignments, 'updated_at = now()'].join(', ')}
      WHERE id = $${values.length}`,
    values,
  );
}

export async function replacePrerequisites(
  db: Queryable,
  movieId: number,
  prerequisiteIds: readonly number[],
): Promise<void> {
  await db.query('DELETE FROM movie_prerequisites WHERE movie_id = $1', [movieId]);
  if (prerequisiteIds.length === 0) return;
  await db.query(
    `INSERT INTO movie_prerequisites (movie_id, prerequisite_id)
     SELECT $1, unnest($2::int[])`,
    [movieId, prerequisiteIds],
  );
}

export async function deleteMovie(db: Queryable, id: number): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM movies WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

/** Loads every prerequisite edge as an adjacency list: movie -> its prerequisites. */
export async function loadPrerequisiteGraph(db: Queryable): Promise<PrerequisiteGraph> {
  const { rows } = await db.query<{ movieId: number; prerequisiteId: number }>(
    `SELECT movie_id AS "movieId", prerequisite_id AS "prerequisiteId"
       FROM movie_prerequisites`,
  );
  const graph = new Map<number, number[]>();
  for (const { movieId, prerequisiteId } of rows) {
    const list = graph.get(movieId);
    if (list) list.push(prerequisiteId);
    else graph.set(movieId, [prerequisiteId]);
  }
  return graph;
}

/**
 * Serialises every transaction that changes prerequisite edges. Without it,
 * two concurrent updates could each pass the cycle check on their own and
 * together still create a cycle. Released automatically at COMMIT/ROLLBACK.
 */
export async function lockPrerequisiteGraph(db: Queryable): Promise<void> {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('movie_prerequisite_graph'))");
}

/** Locks one movie row for the rest of the transaction; returns false if it does not exist. */
export async function lockMovie(db: Queryable, id: number): Promise<boolean> {
  const { rowCount } = await db.query('SELECT 1 FROM movies WHERE id = $1 FOR UPDATE', [id]);
  return (rowCount ?? 0) > 0;
}
