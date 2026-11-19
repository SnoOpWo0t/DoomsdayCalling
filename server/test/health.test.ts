import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db/pool.js';

const fakeDb = { query: async () => ({ rows: [] }) } as unknown as Db;
const app = createApp({ db: fakeDb, config: { CORS_ORIGIN: ['*'], TMDB_API_KEY: undefined } });

describe('GET /api/health', () => {
  it('reports ok when the database responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('unknown routes', () => {
  it('return a structured 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
