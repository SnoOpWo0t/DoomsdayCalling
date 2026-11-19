import type { Queryable } from '../../db/pool.js';
import type { Cinema } from './cinema.types.js';

export const NAME_UNIQUE_INDEX = 'cinemas_name_unique';

const SELECT_CINEMA = `
  SELECT c.id,
         c.name,
         COALESCE(
           (SELECT array_agg(b.seats ORDER BY b.seats)
              FROM cinema_bundle_sizes b
             WHERE b.cinema_id = c.id),
           '{}'
         )            AS "bundleSizes",
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
    FROM cinemas c
`;

export async function listCinemas(db: Queryable): Promise<Cinema[]> {
  const { rows } = await db.query<Cinema>(`${SELECT_CINEMA} ORDER BY c.name`);
  return rows;
}

export async function findCinemaById(db: Queryable, id: number): Promise<Cinema | undefined> {
  const { rows } = await db.query<Cinema>(`${SELECT_CINEMA} WHERE c.id = $1`, [id]);
  return rows[0];
}

export async function insertCinema(
  db: Queryable,
  name: string,
  bundleSizes: readonly number[],
): Promise<number> {
  const { rows } = await db.query<{ id: number }>(
    'INSERT INTO cinemas (name) VALUES ($1) RETURNING id',
    [name],
  );
  const id = rows[0]!.id;
  await db.query(
    `INSERT INTO cinema_bundle_sizes (cinema_id, seats)
     SELECT $1, unnest($2::int[])`,
    [id, bundleSizes],
  );
  return id;
}

export async function deleteCinema(db: Queryable, id: number): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM cinemas WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
