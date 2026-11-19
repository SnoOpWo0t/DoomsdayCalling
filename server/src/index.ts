import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { migrate } from './db/migrate.js';
import { createPool } from './db/pool.js';
import { seed } from './db/seed.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment (e.g. Docker Compose).
}

const config = loadConfig();
const db = createPool(config.DATABASE_URL);

await migrate(db);
if (config.SEED_ON_START) await seed(db);

const app = createApp({ db, config });
const server = app.listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}/api`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    void db.end().then(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
