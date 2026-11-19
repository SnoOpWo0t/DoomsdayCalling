import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db/pool.js';
import type { TmdbClient } from '../src/modules/tmdb/tmdb.client.js';

const fakeDb = { query: async () => ({ rows: [] }) } as unknown as Db;
const config = { CORS_ORIGIN: ['*'], TMDB_API_KEY: undefined };

describe('TMDb proxy without a key', () => {
  const app = createApp({ db: fakeDb, config });

  it('reports the integration as disabled', async () => {
    const res = await request(app).get('/api/tmdb/status');
    expect(res.body).toEqual({ enabled: false });
  });

  it('returns 503 TMDB_NOT_CONFIGURED for lookups', async () => {
    const res = await request(app).get('/api/tmdb/search').query({ query: 'iron man' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('TMDB_NOT_CONFIGURED');
  });
});

describe('TMDb proxy with a client', () => {
  const tmdb: TmdbClient = {
    search: vi.fn(async () => [
      { tmdbId: 1726, title: 'Iron Man', releaseYear: 2008, posterPath: null, overview: '' },
    ]),
    details: vi.fn(async (tmdbId: number) => ({
      tmdbId,
      title: 'Iron Man',
      releaseYear: 2008,
      posterPath: null,
      overview: '',
      runtimeMinutes: 126,
    })),
  };
  const app = createApp({ db: fakeDb, config, tmdb });

  it('reports the integration as enabled', async () => {
    expect((await request(app).get('/api/tmdb/status')).body).toEqual({ enabled: true });
  });

  it('proxies search', async () => {
    const res = await request(app).get('/api/tmdb/search').query({ query: '  iron man ' });
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe('Iron Man');
    expect(tmdb.search).toHaveBeenCalledWith('iron man');
  });

  it('requires a search query', async () => {
    const res = await request(app).get('/api/tmdb/search');
    expect(res.status).toBe(400);
  });

  it('proxies movie details', async () => {
    const res = await request(app).get('/api/tmdb/movies/1726');
    expect(res.body.runtimeMinutes).toBe(126);
  });
});
