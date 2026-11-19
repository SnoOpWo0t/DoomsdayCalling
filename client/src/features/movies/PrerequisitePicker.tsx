import { Check, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { Movie } from '../../api/types';
import styles from './PrerequisitePicker.module.css';

export interface PrerequisitePickerProps {
  /** Candidate movies (the movie being edited is already excluded). */
  movies: Movie[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

/** Searchable checklist for choosing which movies must be watched first. */
export function PrerequisitePicker({ movies, selectedIds, onChange }: PrerequisitePickerProps) {
  const [filter, setFilter] = useState('');
  const labelId = useId();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return movies
      .filter((movie) => movie.title.toLowerCase().includes(needle))
      .sort((a, b) => a.releaseYear - b.releaseYear || a.title.localeCompare(b.title));
  }, [movies, filter]);

  const toggle = (id: number) =>
    onChange(selected.has(id) ? selectedIds.filter((other) => other !== id) : [...selectedIds, id]);

  return (
    <fieldset className={styles.picker} aria-labelledby={labelId}>
      <div className={styles.header}>
        <legend id={labelId} className={styles.legend}>
          Watch these first
        </legend>
        <span className={styles.count}>
          {selected.size === 0 ? 'None selected' : `${selected.size} selected`}
        </span>
      </div>

      {movies.length === 0 ? (
        <p className={styles.empty}>Add more titles to link prerequisites.</p>
      ) : (
        <>
          {movies.length > 6 && (
            <label className={styles.search}>
              <Search size={16} aria-hidden />
              <span className="sr-only">Filter prerequisites</span>
              <input
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter titles"
              />
            </label>
          )}

          <ul className={styles.list}>
            {visible.map((movie) => {
              const checked = selected.has(movie.id);
              return (
                <li key={movie.id}>
                  <label className={styles.option} data-checked={checked}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => toggle(movie.id)}
                    />
                    <span className={styles.box} aria-hidden>
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className={styles.title}>{movie.title}</span>
                    <span className={styles.year}>
                      {movie.kind === 'series' && 'Series · '}
                      {movie.releaseYear}
                    </span>
                  </label>
                </li>
              );
            })}
            {visible.length === 0 && <li className={styles.empty}>No titles match "{filter}".</li>}
          </ul>
        </>
      )}
    </fieldset>
  );
}
