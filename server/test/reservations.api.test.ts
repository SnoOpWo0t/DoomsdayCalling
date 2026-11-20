import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { describeWithDb, useTestApp } from './helpers/test-app.js';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';

describeWithDb('Reservations', () => {
  const ctx = useTestApp();
  let meridian: number;
  let velvet: number;

  beforeEach(async () => {
    meridian = (
      await request(ctx.app)
        .post('/api/cinemas')
        .send({ name: 'Meridian Grand', bundleSizes: [6, 9, 20] })
    ).body.id;
    velvet = (
      await request(ctx.app)
        .post('/api/cinemas')
        .send({ name: 'Velvet Row', bundleSizes: [4, 6] })
    ).body.id;
  });

  const reserve = (body: object, guest?: string) => {
    const req = request(ctx.app).post('/api/reservations').send(body);
    return guest ? req.set('X-Guest-Id', guest) : req;
  };

  it('reserves the fewest bundles, computed on the server', async () => {
    const res = await reserve(
      { cinemaId: meridian, groupSize: 44, name: 'Avengers fan club' },
      ALICE,
    );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Avengers fan club',
      cinema: { id: meridian, name: 'Meridian Grand' },
      groupSize: 44,
      totalBundles: 4,
      bundles: [
        { size: 20, count: 1 },
        { size: 9, count: 2 },
        { size: 6, count: 1 },
      ],
      canCancel: true,
    });
    expect(res.body.reference).toMatch(/^DC-[2-9A-HJKMNP-Z]{6}$/);
  });

  it('refuses a group that cannot be seated exactly', async () => {
    const res = await reserve({ cinemaId: velvet, groupSize: 7, name: 'Odd group' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BOOKING_NOT_POSSIBLE');
  });

  it.each([
    ['an empty name', { name: '  ' }],
    ['a group of 0', { groupSize: 0 }],
    ['a group over 10,000', { groupSize: 10_001 }],
    ['extra fields such as client-made bundles', { bundles: [{ size: 1, count: 44 }] }],
  ])('rejects %s', async (_label, override) => {
    const res = await reserve({ cinemaId: meridian, groupSize: 44, name: 'Club', ...override });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown cinema', async () => {
    expect((await reserve({ cinemaId: 999, groupSize: 6, name: 'Club' })).status).toBe(404);
  });

  it("lists only the guest's own reservations, and everything for API callers", async () => {
    await reserve({ cinemaId: meridian, groupSize: 6, name: 'Alice' }, ALICE);
    await reserve({ cinemaId: meridian, groupSize: 9, name: 'Bob' }, BOB);

    const alice = await request(ctx.app).get('/api/reservations').set('X-Guest-Id', ALICE);
    expect(alice.body.map((r: { name: string }) => r.name)).toEqual(['Alice']);

    const all = await request(ctx.app).get('/api/reservations');
    expect(all.body).toHaveLength(2);
  });

  it('lets only the owner cancel', async () => {
    const { body } = await reserve({ cinemaId: meridian, groupSize: 6, name: 'Alice' }, ALICE);
    const cancel = (guest: string) =>
      request(ctx.app).delete(`/api/reservations/${body.id}`).set('X-Guest-Id', guest);

    expect((await cancel(BOB)).status).toBe(403);
    expect((await cancel(ALICE)).status).toBe(204);
    expect((await cancel(ALICE)).status).toBe(404);
  });

  it('keeps the reserved bundles even if the cinema changes later', async () => {
    const { body } = await reserve({ cinemaId: meridian, groupSize: 44, name: 'Club' }, ALICE);
    await ctx.db.query('DELETE FROM cinema_bundle_sizes WHERE cinema_id = $1 AND seats = 9', [
      meridian,
    ]);
    const list = await request(ctx.app).get('/api/reservations').set('X-Guest-Id', ALICE);
    expect(list.body[0].bundles).toEqual(body.bundles);
  });
});
