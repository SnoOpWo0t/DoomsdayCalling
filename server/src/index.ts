import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { migrate } from './db/migrate.js';
import { createPool } from './db/pool.js';
import { seed } from './db/seed.js';
import { createIntegrations } from './composition.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment (e.g. Docker Compose).
}

const config = loadConfig();
const db = createPool(config.DATABASE_URL);

await migrate(db);
if (config.SEED_ON_START) await seed(db);

const { tmdb, metadata } = createIntegrations(db, config);

const app = createApp({ db, config, tmdb, metadata });
const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}/api`);
  // Fill in posters for titles that have never been looked up, in the background.
  void metadata.backfill().then((found) => {
    if (found > 0) console.log(`Found posters and details for ${found} title(s).`);
  });
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void db.end().then(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
