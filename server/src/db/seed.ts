import { createMovieService } from '../modules/movies/movie.service.js';
import type { Db } from './pool.js';
import { SAMPLE_MOVIES } from './sample-data.js';

/**
 * Loads the sample data through the same service layer the API uses, so
 * every validation rule applies. Does nothing if the database already has
 * movies, which makes it safe to run on every container start.
 */
export async function seed(db: Db, log: (message: string) => void = console.log): Promise<void> {
  const { rows } = await db.query<{ count: number }>('SELECT count(*)::int AS count FROM movies');
  if (rows[0]!.count > 0) {
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
