import type { Config } from './config.js';
import type { Db } from './db/pool.js';
import { createMetadataService } from './modules/metadata/metadata.service.js';
import {
  createTmdbProvider,
  createTvmazeProvider,
  createWikipediaProvider,
} from './modules/metadata/providers.js';
import { createTmdbClient } from './modules/tmdb/tmdb.client.js';

/**
 * Builds the external integrations from config. Shared by the long-running
 * server (index.ts), the Vercel function (vercel.ts) and the CLI, so they
 * all behave the same. Tests skip this and inject fakes instead.
 */
export function createIntegrations(db: Db, config: Config) {
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
  return { tmdb, metadata };
}
