import { loadConfig } from '../config.js';
import { migrate } from './migrate.js';
import { createPool } from './pool.js';

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
    default:
      console.error(`Unknown command "${command ?? ''}". Expected: migrate`);
      process.exitCode = 1;
  }
} finally {
  await db.end();
}
