import cors from 'cors';
import express, { type Express } from 'express';
import type { Config } from './config.js';
import type { Db } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { cinemaRoutes } from './modules/cinemas/cinema.routes.js';
import { createCinemaService } from './modules/cinemas/cinema.service.js';
import {
  createMetadataService,
  type MetadataService,
} from './modules/metadata/metadata.service.js';
import { reservationRoutes } from './modules/reservations/reservation.routes.js';
import { createReservationService } from './modules/reservations/reservation.service.js';
import { movieRoutes } from './modules/movies/movie.routes.js';
import { createMovieService } from './modules/movies/movie.service.js';
import { createTmdbClient, type TmdbClient } from './modules/tmdb/tmdb.client.js';
import { tmdbRoutes } from './modules/tmdb/tmdb.routes.js';

export interface AppDependencies {
  db: Db;
  config: Pick<Config, 'CORS_ORIGIN' | 'TMDB_API_KEY'>;
  /** Override the TMDb client (tests). Defaults to a real client when a key is configured. */
  tmdb?: TmdbClient;
  /** Poster and details lookups. Defaults to a disabled service (no external calls). */
  metadata?: MetadataService;
}

/**
 * Builds the Express application from its dependencies. Kept separate from
 * `index.ts` (which binds a port) so tests can create isolated instances.
 */
export function createApp({ db, config, tmdb, metadata }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  const metadataService = metadata ?? createMetadataService(db, []);
  const movieService = createMovieService(db, {
    onIdentityChanged: (movie) => metadataService.refreshInBackground(movie),
  });
  api.use('/movies', movieRoutes(movieService, metadataService));
  api.use('/cinemas', cinemaRoutes(createCinemaService(db)));
  api.use('/reservations', reservationRoutes(createReservationService(db)));

  const tmdbClient =
    tmdb ?? (config.TMDB_API_KEY ? createTmdbClient({ apiKey: config.TMDB_API_KEY }) : undefined);
  api.use('/tmdb', tmdbRoutes(tmdbClient));

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
