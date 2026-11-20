import { createApp } from './app.js';
import { createIntegrations } from './composition.js';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';

/**
 * Entry point for Vercel. Each function instance reuses one small pool;
 * migrations, seeding and the poster backfill run at build time instead
 * (see `npm run vercel-build`), because serverless functions have no
 * long-running startup phase.
 */
const config = loadConfig();
const db = createPool(config.DATABASE_URL, { max: 3 });
const { tmdb, metadata } = createIntegrations(db, config);

export default createApp({ db, config, tmdb, metadata });
