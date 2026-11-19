import { LoaderCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { ApiError } from '../../api/client';
import { fetchTmdbDetails, useTmdbSearch } from '../../api/queries';
import type { TmdbMovie, TmdbMovieDetails } from '../../api/types';
import { Poster } from '../../components/ui/Poster';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import styles from './TmdbLookup.module.css';

export interface TmdbLookupProps {
  onPick: (movie: TmdbMovieDetails) => void;
}

/**
 * Optional helper that searches TMDb and autofills the form. Only rendered
 * when the server reports the integration as enabled.
 */
export function TmdbLookup({ onPick }: TmdbLookupProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pickingId, setPickingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebouncedValue(query, 300);
  const search = useTmdbSearch(debounced, open);

  const pick = async (movie: TmdbMovie) => {
    setPickingId(movie.tmdbId);
    setError(null);
    try {
      onPick(await fetchTmdbDetails(movie.tmdbId));
      setOpen(false);
      setQuery('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not load that movie.');
    } finally {
      setPickingId(null);
    }
  };

  const results = search.data ?? [];
  const showResults = open && debounced.trim().length >= 2;

  return (
    <div className={styles.lookup}>
      <label className={styles.inputWrap}>
        <Search size={16} aria-hidden />
        <span className="sr-only">Search TMDb</span>
        <input
          type="search"
          value={query}
          placeholder="Search TMDb to autofill, e.g. Thor: Ragnarok"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-controls="tmdb-results"
        />
        {search.isFetching && <LoaderCircle size={16} className={styles.spinner} aria-hidden />}
      </label>

      {showResults && (
        <ul id="tmdb-results" className={styles.results} aria-label="TMDb results">
          {search.isError && (
            <li className={styles.message}>
              {search.error instanceof ApiError ? search.error.message : 'TMDb search failed.'}
            </li>
          )}
          {!search.isError && !search.isFetching && results.length === 0 && (
            <li className={styles.message}>No matches on TMDb.</li>
          )}
          {results.map((movie) => (
            <li key={movie.tmdbId}>
              <button
                type="button"
                className={styles.result}
                onClick={() => void pick(movie)}
                disabled={pickingId !== null}
              >
                <Poster title={movie.title} posterPath={movie.posterPath} size="xs" />
                <span className={styles.resultText}>
                  <span className={styles.resultTitle}>{movie.title}</span>
                  <span className={styles.resultYear}>{movie.releaseYear ?? 'Year unknown'}</span>
                </span>
                {pickingId === movie.tmdbId && (
                  <LoaderCircle size={16} className={styles.spinner} aria-hidden />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
