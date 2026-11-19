import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { seedSampleMovies } from './helpers/fixtures.js';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

describeWithDb('Movies API', () => {
  const ctx = useTestApp();

  const createMovie = (body: Record<string, unknown>) =>
    request(ctx.app).post('/api/movies').send(body);

  const ironMan = { title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126 };

  describe('POST /api/movies', () => {
    it('creates a movie with watched defaulting to false', async () => {
      const res = await createMovie(ironMan);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ...ironMan, watched: false, prerequisiteIds: [] });
      expect(res.body.id).toEqual(expect.any(Number));
    });

    it('trims the title', async () => {
      const res = await createMovie({ ...ironMan, title: '  Iron Man  ' });
      expect(res.body.title).toBe('Iron Man');
    });

    it('rejects a duplicate title, ignoring case', async () => {
      await createMovie(ironMan);
      const res = await createMovie({ ...ironMan, title: 'IRON MAN' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_TITLE');
    });

    it.each([
      ['runtime of 0', { runtimeMinutes: 0 }],
      ['runtime over 300', { runtimeMinutes: 301 }],
      ['fractional runtime', { runtimeMinutes: 120.5 }],
      ['empty title', { title: '   ' }],
      ['release year too early', { releaseYear: 1700 }],
      ['unknown field', { director: 'Jon Favreau' }],
    ])('rejects %s with 400', async (_label, override) => {
      const res = await createMovie({ ...ironMan, ...override });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('stores an optional TMDb id and poster path', async () => {
      const res = await createMovie({ ...ironMan, tmdbId: 1726, posterPath: '/abc123.jpg' });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ tmdbId: 1726, posterPath: '/abc123.jpg' });
    });

    it('defaults TMDb fields to null', async () => {
      const res = await createMovie(ironMan);
      expect(res.body).toMatchObject({ tmdbId: null, posterPath: null });
    });

    it.each(['https://evil.example/x.jpg', '/../../etc/passwd', 'abc.jpg', '/x.gif'])(
      'rejects poster path %j',
      async (posterPath) => {
        const res = await createMovie({ ...ironMan, posterPath });
        expect(res.status).toBe(400);
      },
    );

    it('rejects unknown prerequisite ids', async () => {
      const res = await createMovie({ ...ironMan, prerequisiteIds: [999] });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({
        code: 'UNKNOWN_PREREQUISITE',
        details: { missingIds: [999] },
      });
    });

    it('stores prerequisites and removes duplicates', async () => {
      const first = await createMovie(ironMan);
      const res = await createMovie({
        title: 'The Avengers',
        releaseYear: 2012,
        runtimeMinutes: 143,
        prerequisiteIds: [first.body.id, first.body.id],
      });
      expect(res.status).toBe(201);
      expect(res.body.prerequisiteIds).toEqual([first.body.id]);
    });
  });

  describe('GET /api/movies', () => {
    it('lists movies ordered by release year', async () => {
      await createMovie({ title: 'Thor: Ragnarok', releaseYear: 2017, runtimeMinutes: 130 });
      await createMovie(ironMan);
      const res = await request(ctx.app).get('/api/movies');
      expect(res.status).toBe(200);
      expect(res.body.map((movie: { title: string }) => movie.title)).toEqual([
        'Iron Man',
        'Thor: Ragnarok',
      ]);
    });
  });

  describe('PATCH /api/movies/:id', () => {
    it('marks a movie as watched', async () => {
      const { body: movie } = await createMovie(ironMan);
      const res = await request(ctx.app).patch(`/api/movies/${movie.id}`).send({ watched: true });
      expect(res.status).toBe(200);
      expect(res.body.watched).toBe(true);
    });

    it('replaces the prerequisite list', async () => {
      const ids = await seedSampleMovies(ctx.app);
      const res = await request(ctx.app)
        .patch(`/api/movies/${ids['Avengers: Infinity War']}`)
        .send({ prerequisiteIds: [ids['Thor: Ragnarok']] });
      expect(res.status).toBe(200);
      expect(res.body.prerequisiteIds).toEqual([ids['Thor: Ragnarok']]);
    });

    it('returns 409 CIRCULAR_DEPENDENCY when Endgame becomes a prerequisite of Iron Man', async () => {
      const ids = await seedSampleMovies(ctx.app);
      const res = await request(ctx.app)
        .patch(`/api/movies/${ids['Iron Man']}`)
        .send({ prerequisiteIds: [ids['Avengers: Endgame']] });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
      expect(res.body.error.details.cycle.map((movie: { title: string }) => movie.title)).toEqual([
        'Iron Man',
        'Avengers: Endgame',
        'Avengers: Infinity War',
        'Captain America: Civil War',
        'The Avengers',
        'Iron Man',
      ]);

      // Nothing was written.
      const ironManAfter = await request(ctx.app).get(`/api/movies/${ids['Iron Man']}`);
      expect(ironManAfter.body.prerequisiteIds).toEqual([]);
    });

    it('returns 409 CIRCULAR_DEPENDENCY when a movie lists itself', async () => {
      const { body: movie } = await createMovie(ironMan);
      const res = await request(ctx.app)
        .patch(`/api/movies/${movie.id}`)
        .send({ prerequisiteIds: [movie.id] });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
    });

    it('does not apply other fields when the prerequisite change is rejected', async () => {
      const ids = await seedSampleMovies(ctx.app);
      await request(ctx.app)
        .patch(`/api/movies/${ids['Iron Man']}`)
        .send({ watched: true, prerequisiteIds: [ids['Avengers: Doomsday']] });
      const res = await request(ctx.app).get(`/api/movies/${ids['Iron Man']}`);
      expect(res.body.watched).toBe(false);
    });

    it('rejects renaming to an existing title', async () => {
      await createMovie(ironMan);
      const { body: other } = await createMovie({ ...ironMan, title: 'Iron Man 2' });
      const res = await request(ctx.app)
        .patch(`/api/movies/${other.id}`)
        .send({ title: 'Iron Man' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_TITLE');
    });

    it('rejects an empty patch', async () => {
      const { body: movie } = await createMovie(ironMan);
      const res = await request(ctx.app).patch(`/api/movies/${movie.id}`).send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 for a missing movie', async () => {
      const res = await request(ctx.app).patch('/api/movies/12345').send({ watched: true });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('rejects a non-numeric id with 400', async () => {
      const res = await request(ctx.app).patch('/api/movies/abc').send({ watched: true });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/movies/:id', () => {
    it('deletes a movie and detaches it from dependents', async () => {
      const ids = await seedSampleMovies(ctx.app);
      const del = await request(ctx.app).delete(`/api/movies/${ids['The Avengers']}`);
      expect(del.status).toBe(204);

      const civilWar = await request(ctx.app).get(
        `/api/movies/${ids['Captain America: Civil War']}`,
      );
      expect(civilWar.body.prerequisiteIds).toEqual([]);
    });
  });
});
