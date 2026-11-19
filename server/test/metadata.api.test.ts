import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createMetadataService } from '../src/modules/metadata/metadata.service.js';
import type { MetadataProvider, TitleMetadata } from '../src/modules/metadata/metadata.types.js';
import { seedSampleMovies } from './helpers/fixtures.js';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

const found: TitleMetadata = {
  source: 'wikipedia',
  posterUrl: 'https://upload.wikimedia.org/thumb.jpg',
  posterLargeUrl: 'https://upload.wikimedia.org/full.jpg',
  backdropUrl: null,
  overview: 'A superhero film.',
  genres: [],
  rating: null,
  externalUrl: 'https://en.wikipedia.org/wiki/X',
};

describeWithDb('Title details and metadata', () => {
  const ctx = useTestApp();
  const config = { CORS_ORIGIN: ['*'], TMDB_API_KEY: undefined };

  /** An app whose metadata comes from the given fake providers. */
  const appWith = (...providers: MetadataProvider[]) =>
    createApp({
      db: ctx.db,
      config,
      metadata: createMetadataService(ctx.db, providers, () => {}),
    });

  const provider = (lookup: MetadataProvider['lookup']): MetadataProvider => ({
    name: 'wikipedia',
    lookup: vi.fn(lookup),
  });

  it('returns the title, its prerequisites and the titles it unlocks', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const res = await request(ctx.app).get(`/api/movies/${ids['Avengers: Infinity War']}/details`);

    expect(res.status).toBe(200);
    expect(res.body.movie.title).toBe('Avengers: Infinity War');
    expect(res.body.prerequisites.map((m: { title: string }) => m.title)).toEqual([
      'Captain America: Civil War',
      'Thor: Ragnarok',
    ]);
    expect(res.body.dependents.map((m: { title: string }) => m.title)).toEqual([
      'Avengers: Endgame',
    ]);
    // Lookups are disabled in the default test app.
    expect(res.body.metadata).toBeNull();
  });

  it('returns 404 for an unknown title', async () => {
    expect((await request(ctx.app).get('/api/movies/999/details')).status).toBe(404);
  });

  it('looks details up once, caches them, and exposes the poster in lists', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const wiki = provider(async () => found);
    const app = appWith(wiki);

    const first = await request(app).get(`/api/movies/${ids['Iron Man']}/details`);
    const second = await request(app).get(`/api/movies/${ids['Iron Man']}/details`);

    expect(first.body.metadata).toEqual(found);
    expect(second.body.metadata).toEqual(found);
    expect(wiki.lookup).toHaveBeenCalledTimes(1);

    const list = await request(app).get('/api/movies');
    const ironMan = list.body.find((m: { title: string }) => m.title === 'Iron Man');
    expect(ironMan.posterUrl).toBe(found.posterUrl);
  });

  it('falls through providers in order', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const first = provider(async () => null);
    const second = provider(async () => found);
    const res = await request(appWith(first, second)).get(`/api/movies/${ids['Iron Man']}/details`);
    expect(res.body.metadata).toEqual(found);
    expect(first.lookup).toHaveBeenCalledOnce();
  });

  it('remembers "not found" so it does not ask again', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const empty = provider(async () => null);
    const app = appWith(empty);
    await request(app).get(`/api/movies/${ids['Iron Man']}/details`);
    await request(app).get(`/api/movies/${ids['Iron Man']}/details`);
    expect(empty.lookup).toHaveBeenCalledOnce();
  });

  it('still answers, and retries later, when every source is unreachable', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const down = provider(async () => {
      throw new Error('network down');
    });
    const app = appWith(down);

    const res = await request(app).get(`/api/movies/${ids['Iron Man']}/details`);
    expect(res.status).toBe(200);
    expect(res.body.metadata).toBeNull();

    await request(app).get(`/api/movies/${ids['Iron Man']}/details`);
    expect(down.lookup).toHaveBeenCalledTimes(2);
  });

  it('shares one lookup between concurrent requests', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const slow = provider(
      () => new Promise<TitleMetadata>((resolve) => setTimeout(() => resolve(found), 50)),
    );
    const app = appWith(slow);
    await Promise.all(
      [1, 2, 3].map(() => request(app).get(`/api/movies/${ids['Iron Man']}/details`)),
    );
    expect(slow.lookup).toHaveBeenCalledOnce();
  });

  it('backfills every title that has never been looked up', async () => {
    await seedSampleMovies(ctx.app);
    const wiki = provider(async () => found);
    const service = createMetadataService(ctx.db, [wiki], () => {});

    expect(await service.backfill(0)).toBe(8);
    expect(await service.backfill(0)).toBe(0); // all cached now
    expect(wiki.lookup).toHaveBeenCalledTimes(8);
  });

  it('looks the title up again after a rename', async () => {
    const ids = await seedSampleMovies(ctx.app);
    const wiki = provider(async () => found);
    const app = appWith(wiki);
    await request(app).get(`/api/movies/${ids['Iron Man']}/details`);

    await request(app).patch(`/api/movies/${ids['Iron Man']}`).send({ title: 'Iron Man (2008)' });
    await vi.waitFor(() => expect(wiki.lookup).toHaveBeenCalledTimes(2));
  });
});
