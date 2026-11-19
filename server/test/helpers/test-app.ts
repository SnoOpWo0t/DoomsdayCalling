import type { Express } from 'express';
import { afterAll, beforeEach, describe } from 'vitest';
import { createApp } from '../../src/app.js';
import { migrate } from '../../src/db/migrate.js';
import { createPool, type Db } from '../../src/db/pool.js';

try {
  process.loadEnvFile();
} catch {
  // Rely on the real environment (e.g. CI).
}

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

/**
 * Integration suites need a real Postgres. When TEST_DATABASE_URL is not set
 * they are skipped (with a visible "skipped" count) instead of failing.
 */
export const describeWithDb = TEST_DATABASE_URL ? describe : describe.skip;

export interface TestContext {
  app: Express;
  db: Db;
}

/**
 * Creates an app wired to the test database, migrates it once, and empties
 * every table before each test so tests are independent of one another.
 */
export function useTestApp(): TestContext {
  const context = {} as TestContext;

  if (!TEST_DATABASE_URL) return context;

  const db = createPool(TEST_DATABASE_URL);
  context.db = db;
  context.app = createApp({ db, config: { CORS_ORIGIN: ['*'], TMDB_API_TOKEN: undefined } });

  let migrated = false;

  beforeEach(async () => {
    if (!migrated) {
      await migrate(db, () => {});
      migrated = true;
    }
    const { rows } = await db.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`,
    );
    if (rows.length > 0) {
      const tables = rows.map((row) => `"${row.tablename}"`).join(', ');
      await db.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    }
  });

  afterAll(async () => {
    await db.end();
  });

  return context;
}
