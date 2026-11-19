import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

describeWithDb('Cinemas API', () => {
  const ctx = useTestApp();

  const createCinema = (body: Record<string, unknown>) =>
    request(ctx.app).post('/api/cinemas').send(body);
  const quote = (id: number, groupSize: number | string) =>
    request(ctx.app).get(`/api/cinemas/${id}/booking`).query({ groupSize });

  describe('POST /api/cinemas', () => {
    it('creates a cinema with sorted bundle sizes', async () => {
      const res = await createCinema({ name: 'Meridian Grand', bundleSizes: [20, 6, 9] });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: 'Meridian Grand', bundleSizes: [6, 9, 20] });
    });

    it('removes duplicate bundle sizes', async () => {
      const res = await createCinema({ name: 'Aurora Screens', bundleSizes: [2, 2, 5] });
      expect(res.body.bundleSizes).toEqual([2, 5]);
    });

    it('rejects a duplicate name, ignoring case', async () => {
      await createCinema({ name: 'Aurora Screens', bundleSizes: [2] });
      const res = await createCinema({ name: 'aurora screens', bundleSizes: [3] });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_NAME');
    });

    it.each([
      ['no bundle sizes', { bundleSizes: [] }],
      ['more than 10 different sizes', { bundleSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }],
      ['a bundle of 0 seats', { bundleSizes: [0, 2] }],
      ['a bundle over 500 seats', { bundleSizes: [501] }],
      ['a fractional bundle size', { bundleSizes: [2.5] }],
      ['an empty name', { name: '' }],
    ])('rejects %s with 400', async (_label, override) => {
      const res = await createCinema({ name: 'Aurora Screens', bundleSizes: [2], ...override });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('accepts exactly 10 different sizes once duplicates are removed', async () => {
      const res = await createCinema({
        name: 'Ten Sizes',
        bundleSizes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10],
      });
      expect(res.status).toBe(201);
      expect(res.body.bundleSizes).toHaveLength(10);
    });
  });

  describe('GET /api/cinemas', () => {
    it('lists cinemas by name', async () => {
      await createCinema({ name: 'Velvet Row Cinema', bundleSizes: [4, 6] });
      await createCinema({ name: 'Aurora Screens', bundleSizes: [1, 3, 4] });
      const res = await request(ctx.app).get('/api/cinemas');
      expect(res.body.map((cinema: { name: string }) => cinema.name)).toEqual([
        'Aurora Screens',
        'Velvet Row Cinema',
      ]);
    });
  });

  describe('GET /api/cinemas/:id/booking', () => {
    const briefExamples = [
      { sizes: [1, 3, 4], group: 6, total: 2, bundles: [{ size: 3, count: 2 }] },
      {
        sizes: [2, 5],
        group: 11,
        total: 4,
        bundles: [
          { size: 5, count: 1 },
          { size: 2, count: 3 },
        ],
      },
      {
        sizes: [6, 9, 20],
        group: 44,
        total: 4,
        bundles: [
          { size: 20, count: 1 },
          { size: 9, count: 2 },
          { size: 6, count: 1 },
        ],
      },
    ];

    it.each(briefExamples)(
      'sizes $sizes, group $group -> $total bundles (brief example)',
      async ({ sizes, group, total, bundles }) => {
        const { body: cinema } = await createCinema({ name: 'Test Cinema', bundleSizes: sizes });
        const res = await quote(cinema.id, group);
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          cinema: { id: cinema.id, name: 'Test Cinema', bundleSizes: sizes },
          groupSize: group,
          possible: true,
          totalBundles: total,
          bundles,
        });
      },
    );

    it('sizes 4, 6 and group 7 -> not possible (brief example)', async () => {
      const { body: cinema } = await createCinema({ name: 'Velvet Row', bundleSizes: [4, 6] });
      const res = await quote(cinema.id, 7);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ possible: false, totalBundles: null, bundles: [] });
    });

    it.each([0, 10_001, 2.5, 'abc', ''])('rejects groupSize=%j with 400', async (groupSize) => {
      const { body: cinema } = await createCinema({ name: 'Aurora', bundleSizes: [2] });
      const res = await quote(cinema.id, groupSize);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects a missing groupSize with 400', async () => {
      const { body: cinema } = await createCinema({ name: 'Aurora', bundleSizes: [2] });
      const res = await request(ctx.app).get(`/api/cinemas/${cinema.id}/booking`);
      expect(res.status).toBe(400);
    });

    it('accepts the maximum group size of 10,000', async () => {
      const { body: cinema } = await createCinema({ name: 'Aurora', bundleSizes: [7, 500] });
      const res = await quote(cinema.id, 10_000);
      expect(res.body).toMatchObject({ possible: true, totalBundles: 20 });
    });

    it('returns 404 for an unknown cinema', async () => {
      const res = await quote(9999, 6);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/cinemas/:id', () => {
    it('deletes a cinema', async () => {
      const { body: cinema } = await createCinema({ name: 'Aurora', bundleSizes: [2] });
      expect((await request(ctx.app).delete(`/api/cinemas/${cinema.id}`)).status).toBe(204);
      expect((await request(ctx.app).get(`/api/cinemas/${cinema.id}`)).status).toBe(404);
    });
  });
});
