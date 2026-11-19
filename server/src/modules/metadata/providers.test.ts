import { describe, expect, it, vi } from 'vitest';
import { closeYear, normalizeTitle, safeImageUrl, sameTitle, stripHtml } from './matching.js';
import { createTvmazeProvider, createWikipediaProvider } from './providers.js';

const json = (body: unknown, status = 200) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

const ironMan = { kind: 'movie', title: 'Iron Man', releaseYear: 2008, tmdbId: null } as const;
const wandaVision = {
  kind: 'series',
  title: 'WandaVision',
  releaseYear: 2021,
  tmdbId: null,
} as const;

describe('matching helpers', () => {
  it('normalises titles, ignoring qualifiers, case and punctuation', () => {
    expect(normalizeTitle('Iron Man (2008 film)')).toBe('ironman');
    expect(sameTitle('Captain America: Civil War', 'captain america civil war')).toBe(true);
    expect(sameTitle('Iron Man 2', 'Iron Man')).toBe(false);
  });

  it('accepts release years one apart', () => {
    expect(closeYear(2009, 2008)).toBe(true);
    expect(closeYear(2010, 2008)).toBe(false);
    expect(closeYear(null, 2008)).toBe(false);
  });

  it('only allows https images from known hosts', () => {
    expect(safeImageUrl('https://upload.wikimedia.org/a.jpg')).toBe(
      'https://upload.wikimedia.org/a.jpg',
    );
    expect(safeImageUrl('http://upload.wikimedia.org/a.jpg')).toBeNull();
    expect(safeImageUrl('https://evil.example/a.jpg')).toBeNull();
    expect(safeImageUrl('javascript:alert(1)')).toBeNull();
  });

  it('strips HTML from summaries', () => {
    expect(stripHtml('<p><b>WandaVision</b> blends&nbsp;sitcoms</p>')).toBe(
      'WandaVision blends sitcoms',
    );
    expect(stripHtml('<p></p>')).toBeNull();
  });
});

describe('TVMaze provider', () => {
  const show = {
    name: 'WandaVision',
    premiered: '2021-01-15',
    genres: ['Drama', 'Comedy'],
    rating: { average: 7.6 },
    image: {
      medium: 'https://static.tvmaze.com/m.jpg',
      original: 'https://static.tvmaze.com/o.jpg',
    },
    summary: '<p>Sitcom suburbia.</p>',
    url: 'https://www.tvmaze.com/shows/1',
  };

  it('maps a matching series', async () => {
    const fetch = vi.fn(async () => json([{ show }]));
    expect(await createTvmazeProvider(fetch).lookup(wandaVision)).toEqual({
      source: 'tvmaze',
      posterUrl: 'https://static.tvmaze.com/m.jpg',
      posterLargeUrl: 'https://static.tvmaze.com/o.jpg',
      backdropUrl: null,
      overview: 'Sitcom suburbia.',
      genres: ['Drama', 'Comedy'],
      rating: 7.6,
      externalUrl: 'https://www.tvmaze.com/shows/1',
    });
  });

  it('ignores shows with another title or year', async () => {
    const fetch = vi.fn(async () =>
      json([{ show: { ...show, premiered: '1999-01-01' } }, { show: { ...show, name: 'Vision' } }]),
    );
    expect(await createTvmazeProvider(fetch).lookup(wandaVision)).toBeNull();
  });

  it('does not handle movies', async () => {
    const fetch = vi.fn();
    expect(await createTvmazeProvider(fetch).lookup(ironMan)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('Wikipedia provider', () => {
  const page = (title: string, description: string, index: number, extra = {}) => ({
    title,
    description,
    index,
    extract: `${title} is a 2008 superhero film.`,
    thumbnail: { source: 'https://upload.wikimedia.org/thumb.jpg' },
    original: { source: 'https://upload.wikimedia.org/full.jpg' },
    fullurl: `https://en.wikipedia.org/wiki/${title.replace(/ /g, '_')}`,
    ...extra,
  });

  it('picks the film article, not the comic character', async () => {
    const fetch = vi.fn(async () =>
      json({
        query: {
          pages: [
            page('Iron Man', 'Marvel Comics superhero', 1),
            page('Iron Man (2008 film)', '2008 film by Jon Favreau', 2),
          ],
        },
      }),
    );
    const result = await createWikipediaProvider(fetch).lookup(ironMan);
    expect(result).toMatchObject({
      source: 'wikipedia',
      posterUrl: 'https://upload.wikimedia.org/thumb.jpg',
      posterLargeUrl: 'https://upload.wikimedia.org/full.jpg',
      externalUrl: 'https://en.wikipedia.org/wiki/Iron_Man_(2008_film)',
    });
  });

  it('skips disambiguation pages', async () => {
    const fetch = vi.fn(async () =>
      json({
        query: {
          pages: [page('Iron Man (film)', 'film', 1, { pageprops: { disambiguation: '' } })],
        },
      }),
    );
    expect(await createWikipediaProvider(fetch).lookup(ironMan)).toBeNull();
  });

  it('returns null when nothing matches', async () => {
    const fetch = vi.fn(async () => json({ batchcomplete: true }));
    expect(await createWikipediaProvider(fetch).lookup(ironMan)).toBeNull();
  });

  it('retries once when rate limited, then reports the failure', async () => {
    const fetch = vi.fn(
      async () =>
        new Response('You are making too many requests', {
          status: 429,
          headers: { 'retry-after': '0' },
        }),
    );
    await expect(createWikipediaProvider(fetch).lookup(ironMan)).rejects.toThrow(/429/);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reports non-JSON answers as failures', async () => {
    const fetch = vi.fn(async () => json('<html>oops</html>'));
    await expect(createWikipediaProvider(fetch).lookup(ironMan)).rejects.toThrow(/non-JSON/);
  });
});
