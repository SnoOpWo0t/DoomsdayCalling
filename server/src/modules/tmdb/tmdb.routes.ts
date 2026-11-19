import { Router } from 'express';
import { z } from 'zod';
import { AppError, ErrorCode } from '../../lib/errors.js';
import type { TmdbClient } from './tmdb.client.js';

const searchQuery = z.object({
  query: z
    .string({ error: 'query is required.' })
    .trim()
    .min(1, 'query cannot be empty.')
    .max(100, 'query must be 100 characters or fewer.'),
});

const tmdbIdParam = z.object({
  tmdbId: z.coerce.number().int().positive('TMDb id must be a positive integer.'),
});

/**
 * Proxies TMDb so the API key never reaches the browser. When no key is
 * configured, /status reports `enabled: false` and the other routes return
 * 503 TMDB_NOT_CONFIGURED; the client hides the lookup in that case.
 */
export function tmdbRoutes(tmdb: TmdbClient | undefined): Router {
  const router = Router();

  router.get('/status', (_req, res) => {
    res.json({ enabled: tmdb !== undefined });
  });

  const requireClient = (): TmdbClient => {
    if (!tmdb) {
      throw new AppError(
        503,
        ErrorCode.TMDB_NOT_CONFIGURED,
        'TMDb lookup is not configured on this server. Set TMDB_API_KEY to enable it.',
      );
    }
    return tmdb;
  };

  router.get('/search', async (req, res) => {
    const client = requireClient();
    const { query } = searchQuery.parse(req.query);
    res.json(await client.search(query));
  });

  router.get('/movies/:tmdbId', async (req, res) => {
    const client = requireClient();
    const { tmdbId } = tmdbIdParam.parse(req.params);
    res.json(await client.details(tmdbId));
  });

  return router;
}
