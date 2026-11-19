import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Movie, TitleDetails } from '../../api/types';
import { Poster } from '../../components/ui/Poster';
import { TitlePage } from './TitlePage';

const movie = (id: number, title: string, overrides: Partial<Movie> = {}): Movie => ({
  id,
  kind: 'movie',
  title,
  releaseYear: 2018,
  runtimeMinutes: 149,
  episodeCount: 1,
  watched: false,
  tmdbId: null,
  posterPath: null,
  posterUrl: null,
  prerequisiteIds: [],
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const details: TitleDetails = {
  movie: movie(6, 'Avengers: Infinity War', { prerequisiteIds: [4, 5] }),
  prerequisites: [
    movie(4, 'Captain America: Civil War', { watched: true }),
    movie(5, 'Thor: Ragnarok'),
  ],
  dependents: [movie(7, 'Avengers: Endgame')],
  metadata: {
    source: 'wikipedia',
    posterUrl: 'https://upload.wikimedia.org/small.jpg',
    posterLargeUrl: 'https://upload.wikimedia.org/large.jpg',
    backdropUrl: null,
    overview: 'The Avengers try to stop Thanos.',
    genres: ['Action'],
    rating: 8.4,
    externalUrl: 'https://en.wikipedia.org/wiki/Avengers:_Infinity_War',
  },
};

function renderAt(path: string, responses: Record<string, { status: number; body: unknown }>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const match = Object.entries(responses).find(([suffix]) => url.endsWith(suffix));
    const { status, body } = match?.[1] ?? { status: 200, body: [] };
    return new Response(JSON.stringify(body), { status });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/titles/:id" element={<TitlePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TitlePage', () => {
  it('shows the title, external details and related titles', async () => {
    renderAt('/titles/6', { '/movies/6/details': { status: 200, body: details } });

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Avengers: Infinity War' }),
    ).toBeInTheDocument();
    expect(screen.getByText('The Avengers try to stop Thanos.')).toBeInTheDocument();
    expect(screen.getByText('8.4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Details from Wikipedia/ })).toHaveAttribute(
      'href',
      details.metadata!.externalUrl,
    );

    const first = screen.getByRole('region', { name: 'Watch these first' });
    expect(
      within(first)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual([
      expect.stringContaining('Captain America: Civil War'),
      expect.stringContaining('Thor: Ragnarok'),
    ]);
    expect(within(first).getByLabelText('Watched')).toBeInTheDocument();

    const next = screen.getByRole('region', { name: 'Unlocks next' });
    expect(within(next).getByRole('link')).toHaveAttribute('href', '/titles/7');

    expect(screen.getByRole('link', { name: /Rewatch plan/ })).toHaveAttribute(
      'href',
      '/plan?target=6',
    );
  });

  it('still works when no external details were found', async () => {
    renderAt('/titles/6', {
      '/movies/6/details': { status: 200, body: { ...details, metadata: null } },
    });
    expect(await screen.findByText('No overview found for this title yet.')).toBeInTheDocument();
  });

  it('shows a not-found state for unknown titles', async () => {
    renderAt('/titles/999', {
      '/movies/999/details': {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Movie 999 was not found.' } },
      },
    });
    expect(await screen.findByText('Title not found')).toBeInTheDocument();
  });
});

describe('Poster', () => {
  it('uses the automatically found poster when there is no TMDb path', () => {
    const { container } = render(
      <Poster title="Iron Man" posterPath={null} posterUrl="https://upload.wikimedia.org/a.jpg" />,
    );
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://upload.wikimedia.org/a.jpg',
    );
  });

  it('prefers the TMDb poster chosen by the user', () => {
    const { container } = render(
      <Poster
        title="Iron Man"
        posterPath="/abc.jpg"
        posterUrl="https://upload.wikimedia.org/a.jpg"
      />,
    );
    expect(container.querySelector('img')?.getAttribute('src')).toContain('image.tmdb.org');
  });

  it('falls back to initials without any poster', () => {
    render(<Poster title="Avengers: Infinity War" posterPath={null} />);
    expect(screen.getByText('IW')).toBeInTheDocument();
  });
});
