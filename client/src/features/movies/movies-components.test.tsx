import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Movie } from '../../api/types';
import { CycleAlert } from './CycleAlert';
import { PrerequisitePicker } from './PrerequisitePicker';

// jsdom does not implement scrollIntoView.
Element.prototype.scrollIntoView = vi.fn();

const movie = (id: number, title: string, releaseYear: number): Movie => ({
  id,
  kind: 'movie',
  title,
  releaseYear,
  runtimeMinutes: 120,
  episodeCount: 1,
  watched: false,
  tmdbId: null,
  posterPath: null,
  posterUrl: null,
  prerequisiteIds: [],
  createdAt: '',
  updatedAt: '',
});

describe('CycleAlert', () => {
  it('lists every movie in the loop, in order', () => {
    render(
      <CycleAlert
        cycle={[
          { id: 1, title: 'Iron Man' },
          { id: 7, title: 'Avengers: Endgame' },
          { id: 6, title: 'Avengers: Infinity War' },
          { id: 1, title: 'Iron Man' },
        ]}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('That would create a loop');
    const steps = within(screen.getByRole('list', { name: 'Dependency loop' })).getAllByRole(
      'listitem',
    );
    expect(steps.map((step) => step.textContent)).toEqual([
      'Iron Man',
      'Avengers: Endgame',
      'Avengers: Infinity War',
      'Iron Man',
    ]);
  });
});

describe('PrerequisitePicker', () => {
  const movies = [movie(2, 'The Avengers', 2012), movie(1, 'Iron Man', 2008)];

  it('lists candidates by release year and reflects the selection', () => {
    render(<PrerequisitePicker movies={movies} selectedIds={[1]} onChange={() => {}} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.map((box) => box.closest('label')?.textContent)).toEqual([
      'Iron Man2008',
      'The Avengers2012',
    ]);
    expect(screen.getByRole('checkbox', { name: /Iron Man/ })).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });

  it('adds and removes ids when toggled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <PrerequisitePicker movies={movies} selectedIds={[]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('checkbox', { name: /The Avengers/ }));
    expect(onChange).toHaveBeenLastCalledWith([2]);

    rerender(<PrerequisitePicker movies={movies} selectedIds={[2, 1]} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox', { name: /The Avengers/ }));
    expect(onChange).toHaveBeenLastCalledWith([1]);
  });

  it('explains when there is nothing to pick', () => {
    render(<PrerequisitePicker movies={[]} selectedIds={[]} onChange={() => {}} />);
    expect(screen.getByText(/Add more titles/)).toBeInTheDocument();
  });
});
