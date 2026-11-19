import cors from 'cors';
import express, { type Express } from 'express';
import type { Config } from './config.js';
import type { Db } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export interface AppDependencies {
  db: Db;
  config: Pick<Config, 'CORS_ORIGIN' | 'TMDB_API_TOKEN'>;
}

/**
 * Builds the Express application from its dependencies. Kept separate from
 * `index.ts` (which binds a port) so tests can create isolated instances.
 */
export function createApp({ db, config }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/health', async (_req, res) => {
    await db.query('SELECT 1');
    res.json({ status: 'ok' });
  });

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
