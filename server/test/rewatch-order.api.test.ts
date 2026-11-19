import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { seedSampleMovies } from './helpers/fixtures.js';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

describeWithDb('GET /api/movies/:id/rewatch-order', () => {
  const ctx = useTestApp();
  let ids: Record<string, number>;

  beforeEach(async () => {
    ids = await seedSampleMovies(ctx.app);
  });

  const plan = (title: string) => request(ctx.app).get(`/api/movies/${ids[title]}/rewatch-order`);
  const titles = (body: { movies: Array<{ title: string }> }) =>
    body.movies.map((movie) => movie.title);

  it('returns all 7 other movies for Avengers: Doomsday in release order', async () => {
    const res = await plan('Avengers: Doomsday');
    expect(res.status).toBe(200);
    expect(res.body.target.title).toBe('Avengers: Doomsday');
    expect(titles(res.body)).toEqual([
      'Iron Man',
      'Captain America: The First Avenger',
      'The Avengers',
      'Captain America: Civil War',
      'Thor: Ragnarok',
      'Avengers: Infinity War',
      'Avengers: Endgame',
    ]);
    expect(res.body).toMatchObject({
      totalCount: 7,
      watchedCount: 0,
      unwatchedRuntimeMinutes: 126 + 124 + 143 + 147 + 130 + 149 + 181,
    });
  });

  it('returns Iron Man and The First Avenger, then The Avengers, for Civil War', async () => {
    const res = await plan('Captain America: Civil War');
    const order = titles(res.body);
    expect(order).toHaveLength(3);
    expect(order.slice(0, 2).sort()).toEqual(['Captain America: The First Avenger', 'Iron Man']);
    expect(order[2]).toBe('The Avengers');
  });

  it('returns an empty list for Thor: Ragnarok', async () => {
    const res = await plan('Thor: Ragnarok');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      movies: [],
      totalCount: 0,
      watchedCount: 0,
      unwatchedRuntimeMinutes: 0,
    });
  });

  it('counts watched movies and only sums the runtime of unwatched ones', async () => {
    for (const title of ['Iron Man', 'The Avengers', 'Avengers: Endgame', 'Thor: Ragnarok']) {
      await request(ctx.app).patch(`/api/movies/${ids[title]}`).send({ watched: true });
    }
    // Watching the target itself must not affect its own plan.
    await request(ctx.app)
      .patch(`/api/movies/${ids['Avengers: Doomsday']}`)
      .send({ watched: true });

    const res = await plan('Avengers: Doomsday');
    expect(res.body).toMatchObject({
      totalCount: 7,
      watchedCount: 4,
      unwatchedRuntimeMinutes: 124 + 147 + 149, // First Avenger, Civil War, Infinity War
    });
  });

  it('reflects prerequisite changes immediately', async () => {
    await request(ctx.app)
      .patch(`/api/movies/${ids['Avengers: Infinity War']}`)
      .send({ prerequisiteIds: [ids['Thor: Ragnarok']] });

    const res = await plan('Avengers: Doomsday');
    expect(titles(res.body)).toEqual([
      'Thor: Ragnarok',
      'Avengers: Infinity War',
      'Avengers: Endgame',
    ]);
  });

  it('returns 404 for an unknown movie', async () => {
    const res = await request(ctx.app).get('/api/movies/9999/rewatch-order');
    expect(res.status).toBe(404);
  });
});
