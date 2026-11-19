import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { seedSampleMovies } from './helpers/fixtures.js';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

describeWithDb('Series support', () => {
  const ctx = useTestApp();

  const create = (body: Record<string, unknown>) => request(ctx.app).post('/api/movies').send(body);

  const wandaVision = {
    kind: 'series',
    title: 'WandaVision',
    releaseYear: 2021,
    runtimeMinutes: 39,
    episodeCount: 9,
  };

  describe('creating titles', () => {
    it('defaults to a single-episode movie, so the brief requests are unchanged', async () => {
      const res = await create({ title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ kind: 'movie', episodeCount: 1 });
    });

    it('creates a series with an episode count', async () => {
      const res = await create(wandaVision);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ kind: 'series', episodeCount: 9, runtimeMinutes: 39 });
    });

    it('defaults a series without an episode count to one episode', async () => {
      const res = await create({ ...wandaVision, episodeCount: undefined });
      expect(res.body.episodeCount).toBe(1);
    });

    it.each([
      ['a movie with several episodes', { kind: 'movie', episodeCount: 3 }],
      ['zero episodes', { episodeCount: 0 }],
      ['more than 500 episodes', { episodeCount: 501 }],
      ['an unknown kind', { kind: 'documentary' }],
    ])('rejects %s', async (_label, override) => {
      const res = await create({ ...wandaVision, ...override });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('updating titles', () => {
    it('resets the episode count when a series becomes a movie', async () => {
      const { body: series } = await create(wandaVision);
      const res = await request(ctx.app).patch(`/api/movies/${series.id}`).send({ kind: 'movie' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ kind: 'movie', episodeCount: 1 });
    });

    it('rejects giving an existing movie several episodes', async () => {
      const { body: movie } = await create({
        title: 'Iron Man',
        releaseYear: 2008,
        runtimeMinutes: 126,
      });
      const res = await request(ctx.app).patch(`/api/movies/${movie.id}`).send({ episodeCount: 4 });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('allows changing the episode count of a series', async () => {
      const { body: series } = await create(wandaVision);
      const res = await request(ctx.app)
        .patch(`/api/movies/${series.id}`)
        .send({ episodeCount: 10 });
      expect(res.body.episodeCount).toBe(10);
    });
  });

  describe('rewatch plans across movies and series', () => {
    it('orders series and movies together and counts every episode', async () => {
      const ids = await seedSampleMovies(ctx.app);
      const { body: series } = await create({
        ...wandaVision,
        prerequisiteIds: [ids['Avengers: Endgame']],
      });
      const { body: strange } = await create({
        title: 'Doctor Strange in the Multiverse of Madness',
        releaseYear: 2022,
        runtimeMinutes: 126,
        prerequisiteIds: [series.id],
      });

      const res = await request(ctx.app).get(`/api/movies/${strange.id}/rewatch-order`);
      const titles = res.body.movies.map((title: { title: string }) => title.title);

      expect(titles).toHaveLength(8); // the 7 brief movies up to Endgame, plus WandaVision
      expect(titles.slice(-2)).toEqual(['Avengers: Endgame', 'WandaVision']);
      const movieMinutes = 126 + 124 + 143 + 147 + 130 + 149 + 181;
      expect(res.body.unwatchedRuntimeMinutes).toBe(movieMinutes + 9 * 39);
    });

    it('rejects a cycle that runs through a series', async () => {
      const ids = await seedSampleMovies(ctx.app);
      const { body: series } = await create({
        ...wandaVision,
        prerequisiteIds: [ids['Avengers: Endgame']],
      });
      const res = await request(ctx.app)
        .patch(`/api/movies/${ids['Iron Man']}`)
        .send({ prerequisiteIds: [series.id] });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
      expect(res.body.error.details.cycle[1].title).toBe('WandaVision');
    });

    it('keeps the brief result: 7 titles before Avengers: Doomsday', async () => {
      const ids = await seedSampleMovies(ctx.app);
      await create({ ...wandaVision, prerequisiteIds: [ids['Avengers: Endgame']] });
      const res = await request(ctx.app).get(
        `/api/movies/${ids['Avengers: Doomsday']}/rewatch-order`,
      );
      expect(res.body.totalCount).toBe(7);
    });
  });
});
