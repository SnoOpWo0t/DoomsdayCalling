import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

const respond = (status: number, body?: unknown) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('api client', () => {
  it('returns parsed JSON on success', async () => {
    respond(200, [{ id: 1 }]);
    await expect(api.get('/movies')).resolves.toEqual([{ id: 1 }]);
  });

  it('returns undefined for 204 No Content', async () => {
    respond(204);
    await expect(api.delete('/movies/1')).resolves.toBeUndefined();
  });

  it('throws an ApiError with the server code and exposes the cycle path', async () => {
    const cycle = [
      { id: 1, title: 'Iron Man' },
      { id: 7, title: 'Avengers: Endgame' },
      { id: 1, title: 'Iron Man' },
    ];
    respond(409, { error: { code: 'CIRCULAR_DEPENDENCY', message: 'Loop', details: { cycle } } });

    const error = await api.patch('/movies/1', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'CIRCULAR_DEPENDENCY' });
    expect((error as ApiError).cycle).toEqual(cycle);
  });

  it('maps validation issues to field errors', async () => {
    respond(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [
          { path: 'runtimeMinutes', message: 'Runtime must be between 1 and 300 minutes.' },
        ],
      },
    });
    const error = (await api.post('/movies', {}).catch((caught: unknown) => caught)) as ApiError;
    expect(error.fieldErrors).toEqual({
      runtimeMinutes: 'Runtime must be between 1 and 300 minutes.',
    });
  });

  it('reports network failures clearly', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.get('/movies')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});
