import { loadConfig } from '../config.js';
import { migrate } from './migrate.js';
import { createIntegrations } from '../composition.js';
import { createPool } from './pool.js';
import { seed } from './seed.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

const command = process.argv[2];
const config = loadConfig();
const db = createPool(config.DATABASE_URL);

try {
  switch (command) {
    case 'migrate':
      await migrate(db);
      console.log('Database is up to date.');
      break;
    case 'seed':
      await migrate(db);
      await seed(db);
      break;
    case 'backfill': {
      const found = await createIntegrations(db, config).metadata.backfill();
      console.log(`Found posters and details for ${found} title(s).`);
      break;
    }
    default:
      console.error(`Unknown command "${command ?? ''}". Expected: migrate | seed | backfill`);
      process.exitCode = 1;
  }
} finally {
  await db.end();
}
