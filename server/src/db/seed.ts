import { createCinemaService } from '../modules/cinemas/cinema.service.js';
import { createMovieService } from '../modules/movies/movie.service.js';
import type { Db } from './pool.js';
import { SAMPLE_CINEMAS, SAMPLE_MOVIES } from './sample-data.js';

type Log = (message: string) => void;

/**
 * Loads the sample data through the same service layer the API uses, so
 * every validation rule applies. Each table is only seeded while it is
 * empty, which makes this safe to run on every container start.
 */
export async function seed(db: Db, log: Log = console.log): Promise<void> {
  await seedMovies(db, log);
  await seedCinemas(db, log);
}

async function isEmpty(db: Db, table: 'movies' | 'cinemas'): Promise<boolean> {
  const { rows } = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM ${table}`);
  return rows[0]!.count === 0;
}

async function seedMovies(db: Db, log: Log): Promise<void> {
  if (!(await isEmpty(db, 'movies'))) {
    log('Movies already present, skipping movie seed.');
    return;
  }

  const movies = createMovieService(db);
  const idsByTitle = new Map<string, number>();
  for (const sample of SAMPLE_MOVIES) {
    const movie = await movies.create({
      title: sample.title,
      releaseYear: sample.releaseYear,
      runtimeMinutes: sample.runtimeMinutes,
      watched: false,
      prerequisiteIds: sample.prerequisites.map((title) => idsByTitle.get(title)!),
    });
    idsByTitle.set(movie.title, movie.id);
  }
  log(`Seeded ${SAMPLE_MOVIES.length} movies.`);
}

async function seedCinemas(db: Db, log: Log): Promise<void> {
  if (!(await isEmpty(db, 'cinemas'))) {
    log('Cinemas already present, skipping cinema seed.');
    return;
  }

  const cinemas = createCinemaService(db);
  for (const sample of SAMPLE_CINEMAS) await cinemas.create(sample);
  log(`Seeded ${SAMPLE_CINEMAS.length} cinemas.`);
}
