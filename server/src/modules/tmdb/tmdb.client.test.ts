import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../lib/errors.js';
import { createTmdbClient } from './tmdb.client.js';

const V3_KEY = '0123456789abcdef0123456789abcdef';
const V4_TOKEN = 'header.payload.signature';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ironMan = {
  id: 1726,
  title: 'Iron Man',
  release_date: '2008-04-30',
  poster_path: '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
  overview: 'After being held captive...',
  runtime: 126,
};

describe('createTmdbClient', () => {
  it('maps search results to a compact shape', async () => {
    const fetch = vi.fn(async () => json({ results: [ironMan] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetch });

    expect(await client.search('iron man')).toEqual([
      {
        tmdbId: 1726,
        title: 'Iron Man',
        releaseYear: 2008,
        posterPath: '/78lPtwv72eTNqFW9COBYI0dWDJa.jpg',
        overview: 'After being held captive...',
      },
    ]);
  });

  it('sends a v3 key as a query parameter', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      json({ results: [] }),
    );
    await createTmdbClient({ apiKey: V3_KEY, fetch }).search('thor');

    const [url, init] = fetch.mock.calls[0]!;
    expect(new URL(String(url)).searchParams.get('api_key')).toBe(V3_KEY);
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('sends a v4 token as a bearer header', async () => {
    const fetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      json({ results: [] }),
    );
    await createTmdbClient({ apiKey: V4_TOKEN, fetch }).search('thor');

    const [url, init] = fetch.mock.calls[0]!;
    expect(new URL(String(url)).searchParams.has('api_key')).toBe(false);
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${V4_TOKEN}`);
  });

  it('returns runtime from movie details', async () => {
    const fetch = vi.fn(async () => json(ironMan));
    const details = await createTmdbClient({ apiKey: V3_KEY, fetch }).details(1726);
    expect(details.runtimeMinutes).toBe(126);
  });

  it('handles missing dates, posters and runtimes', async () => {
    const fetch = vi.fn(async () =>
      json({ id: 1, title: 'Untitled', release_date: '', poster_path: null, runtime: 0 }),
    );
    const details = await createTmdbClient({ apiKey: V3_KEY, fetch }).details(1);
    expect(details).toMatchObject({ releaseYear: null, posterPath: null, runtimeMinutes: null });
  });

  it('drops poster paths that are not plain TMDb file names', async () => {
    const fetch = vi.fn(async () =>
      json({ results: [{ ...ironMan, poster_path: 'https://evil.example/x.jpg' }] }),
    );
    const [result] = await createTmdbClient({ apiKey: V3_KEY, fetch }).search('iron man');
    expect(result!.posterPath).toBeNull();
  });

  it('caches identical requests', async () => {
    const fetch = vi.fn(async () => json({ results: [ironMan] }));
    const client = createTmdbClient({ apiKey: V3_KEY, fetch });
    await client.search('iron man');
    await client.search('iron man');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('turns upstream failures into a 502 AppError', async () => {
    const fetch = vi.fn(async () => json({ status_message: 'Invalid API key' }, 401));
    await expect(createTmdbClient({ apiKey: V3_KEY, fetch }).search('x')).rejects.toMatchObject({
      status: 502,
      code: 'EXTERNAL_SERVICE_UNAVAILABLE',
    });
  });

  it('turns network errors into a 502 AppError', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    await expect(createTmdbClient({ apiKey: V3_KEY, fetch }).search('x')).rejects.toBeInstanceOf(
      AppError,
    );
  });

  it('maps a TMDb 404 to NOT_FOUND', async () => {
    const fetch = vi.fn(async () => json({}, 404));
    await expect(createTmdbClient({ apiKey: V3_KEY, fetch }).details(999)).rejects.toMatchObject({
      status: 404,
    });
  });
});
