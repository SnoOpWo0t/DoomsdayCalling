import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { migrate } from './db/migrate.js';
import { createPool } from './db/pool.js';
import { seed } from './db/seed.js';
import { createMetadataService } from './modules/metadata/metadata.service.js';
import {
  createTmdbProvider,
  createTvmazeProvider,
  createWikipediaProvider,
} from './modules/metadata/providers.js';
import { createTmdbClient } from './modules/tmdb/tmdb.client.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment (e.g. Docker Compose).
}

const config = loadConfig();
const db = createPool(config.DATABASE_URL);

await migrate(db);
if (config.SEED_ON_START) await seed(db);

// Composition root: external integrations are created here and injected,
// so tests can build the app without any network access.
const tmdb = config.TMDB_API_KEY ? createTmdbClient({ apiKey: config.TMDB_API_KEY }) : undefined;
const metadata = createMetadataService(
  db,
  config.METADATA_LOOKUPS
    ? [
        ...(tmdb ? [createTmdbProvider(tmdb)] : []),
        createTvmazeProvider(),
        createWikipediaProvider(),
      ]
    : [],
);

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
