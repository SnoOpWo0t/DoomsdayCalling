import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { applyWatched } from '../../api/queries';
import type { Movie, RewatchPlan } from '../../api/types';
import { PlanTimeline } from './PlanTimeline';

const movie = (id: number, title: string, runtimeMinutes: number, watched = false): Movie => ({
  id,
  kind: 'movie',
  title,
  releaseYear: 2000 + id,
  runtimeMinutes,
  episodeCount: 1,
  watched,
  tmdbId: null,
  posterPath: null,
  posterUrl: null,
  prerequisiteIds: [],
  createdAt: '',
  updatedAt: '',
});

const plan: RewatchPlan = {
  target: { ...movie(9, 'Avengers: Doomsday', 150), releaseYear: 2100 },
  movies: [
    movie(1, 'Iron Man', 126, true),
    movie(2, 'The Avengers', 143),
    movie(3, 'Endgame', 181),
  ],
  totalCount: 3,
  watchedCount: 1,
  unwatchedRuntimeMinutes: 143 + 181,
};

describe('applyWatched', () => {
  it('recomputes the watched count and remaining runtime', () => {
    const next = applyWatched(plan, 2, true);
    expect(next.watchedCount).toBe(2);
    expect(next.unwatchedRuntimeMinutes).toBe(181);
    expect(next.movies.find((m) => m.id === 2)?.watched).toBe(true);
  });

  it('handles un-watching', () => {
    const next = applyWatched(plan, 1, false);
    expect(next).toMatchObject({ watchedCount: 0, unwatchedRuntimeMinutes: 126 + 143 + 181 });
  });

  it('counts every episode of a series', () => {
    const withSeries: RewatchPlan = {
      ...plan,
      movies: [...plan.movies, { ...movie(4, 'WandaVision', 39), kind: 'series', episodeCount: 9 }],
      totalCount: 4,
    };
    expect(applyWatched(withSeries, 2, true).unwatchedRuntimeMinutes).toBe(181 + 9 * 39);
  });

  it('ignores movies that are not in the plan', () => {
    expect(applyWatched(plan, 42, true)).toMatchObject({
      watchedCount: 1,
      unwatchedRuntimeMinutes: 324,
    });
  });
});

describe('PlanTimeline', () => {
  const renderTimeline = () =>
    render(
      <MemoryRouter>
        <PlanTimeline movies={plan.movies} target={plan.target} onToggleWatched={vi.fn()} />
      </MemoryRouter>,
    );

  it('renders the steps in order and ends with the target', () => {
    renderTimeline();
    const steps = within(
      screen.getByRole('list', { name: 'Rewatch order for Avengers: Doomsday' }),
    ).getAllByRole('listitem');
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent('Iron Man');
    expect(steps[3]).toHaveTextContent('Avengers: Doomsday');
    expect(within(steps[3]!).getByRole('link', { name: /Book seats/ })).toHaveAttribute(
      'href',
      '/booking',
    );
  });

  it('only offers booking when the target is still to be released', () => {
    render(
      <MemoryRouter>
        <PlanTimeline
          movies={plan.movies}
          target={{ ...plan.target, releaseYear: 2008 }}
          onToggleWatched={vi.fn()}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link', { name: /Book seats/ })).not.toBeInTheDocument();
  });

  it('marks the first unwatched movie as up next', () => {
    renderTimeline();
    expect(screen.getByText('Up next').closest('li')).toHaveTextContent('The Avengers');
  });

  it('exposes watched state on each tick', () => {
    renderTimeline();
    expect(screen.getByRole('button', { name: 'Mark Iron Man as not watched' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mark Endgame as watched' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
