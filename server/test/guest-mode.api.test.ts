import request from 'supertest';
import { expect, it } from 'vitest';
import { seedSampleMovies } from './helpers/fixtures.js';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

describeWithDb('Guest mode', () => {
  const ctx = useTestApp();
  const as = (guest: string | undefined) => ({
    get: (url: string) => {
      const req = request(ctx.app).get(url);
      return guest ? req.set('X-Guest-Id', guest) : req;
    },
    post: (url: string, body: object) => {
      const req = request(ctx.app).post(url).send(body);
      return guest ? req.set('X-Guest-Id', guest) : req;
    },
    patch: (url: string, body: object) => {
      const req = request(ctx.app).patch(url).send(body);
      return guest ? req.set('X-Guest-Id', guest) : req;
    },
    delete: (url: string) => {
      const req = request(ctx.app).delete(url);
      return guest ? req.set('X-Guest-Id', guest) : req;
    },
  });

  const newTitle = { title: 'Loki', releaseYear: 2021, runtimeMinutes: 51 };

  it('marks titles a guest added as theirs, and never exposes owner ids', async () => {
    const res = await as(ALICE).post('/api/movies', newTitle);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ canEdit: true, addedByYou: true });
    expect(res.body).not.toHaveProperty('createdBy');

    const bobsView = await as(BOB).get(`/api/movies/${res.body.id}`);
    expect(bobsView.body).toMatchObject({ canEdit: false, addedByYou: false });
  });

  it("lets a guest edit and delete their own titles but not someone else's", async () => {
    const { body: loki } = await as(ALICE).post('/api/movies', newTitle);

    expect((await as(BOB).patch(`/api/movies/${loki.id}`, { title: 'Hacked' })).status).toBe(403);
    expect((await as(BOB).delete(`/api/movies/${loki.id}`)).status).toBe(403);

    expect((await as(ALICE).patch(`/api/movies/${loki.id}`, { title: 'Loki S1' })).status).toBe(
      200,
    );
    expect((await as(ALICE).delete(`/api/movies/${loki.id}`)).status).toBe(204);
  });

  it('keeps sample titles read-only for guests, except watched and prerequisites', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const ironMan = `/api/movies/${ids['Iron Man']}`;

    const rename = await as(ALICE).patch(ironMan, { runtimeMinutes: 200 });
    expect(rename.status).toBe(403);
    expect(rename.body.error.code).toBe('FORBIDDEN');
    expect((await as(ALICE).delete(ironMan)).status).toBe(403);

    expect((await as(ALICE).patch(ironMan, { watched: true })).status).toBe(200);
    expect(
      (await as(ALICE).patch(ironMan, { prerequisiteIds: [ids['Thor: Ragnarok']] })).status,
    ).toBe(200);
  });

  it("still lets guests try the brief's circular dependency example", async () => {
    const ids = await seedSampleMovies(ctx.app);
    const res = await as(ALICE).patch(`/api/movies/${ids['Iron Man']}`, {
      prerequisiteIds: [ids['Avengers: Endgame']],
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CIRCULAR_DEPENDENCY');
  });

  it('gives API callers without a guest id full access, as the brief expects', async () => {
    const { body: loki } = await as(ALICE).post('/api/movies', newTitle);
    expect((await as(undefined).get(`/api/movies/${loki.id}`)).body.canEdit).toBe(true);
    expect((await as(undefined).patch(`/api/movies/${loki.id}`, { title: 'Loki!' })).status).toBe(
      200,
    );
    expect((await as(undefined).delete(`/api/movies/${loki.id}`)).status).toBe(204);
  });

  it('rejects a malformed guest id', async () => {
    const res = await as('not-a-uuid').get('/api/movies');
    expect(res.status).toBe(400);
  });

  it('applies to rewatch plans and details pages too', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const plan = await as(ALICE).get(`/api/movies/${ids['Avengers: Doomsday']}/rewatch-order`);
    expect(plan.body.target.canEdit).toBe(false);
    expect(plan.body.movies.every((m: { canEdit: boolean }) => !m.canEdit)).toBe(true);

    const details = await as(ALICE).get(`/api/movies/${ids['Avengers: Endgame']}/details`);
    expect(details.body.movie).not.toHaveProperty('createdBy');
    expect(details.body.prerequisites[0].canEdit).toBe(false);
  });
});
