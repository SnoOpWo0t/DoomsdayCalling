import { Film, Plus, RefreshCw, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMovies, useToggleWatched } from '../../api/queries';
import type { Movie } from '../../api/types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StateMessage } from '../../components/ui/StateMessage';
import { formatRuntime, pluralize } from '../../lib/format';
import { DeleteMovieDialog } from './DeleteMovieDialog';
import { MovieFormDialog } from './MovieFormDialog';
import { MovieRow } from './MovieRow';
import styles from './MoviesPage.module.css';

type Filter = 'all' | 'unwatched' | 'watched';

/** Which dialog is open: none, the add form, the edit form or a delete confirmation. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; movie: Movie }
  | { kind: 'delete'; movie: Movie };

export function MoviesPage() {
  const movies = useMovies();
  const toggleWatched = useToggleWatched();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const closeDialog = () => setDialog({ kind: 'none' });

  const all = useMemo(() => movies.data ?? [], [movies.data]);
  const byId = useMemo(() => new Map(all.map((movie) => [movie.id, movie])), [all]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return all.filter(
      (movie) =>
        (filter === 'all' || movie.watched === (filter === 'watched')) &&
        movie.title.toLowerCase().includes(needle),
    );
  }, [all, filter, search]);

  const watchedCount = all.filter((movie) => movie.watched).length;
  const totalRuntime = all.reduce((sum, movie) => sum + movie.runtimeMinutes, 0);
  const prerequisitesOf = (movie: Movie) =>
    movie.prerequisiteIds
      .map((id) => byId.get(id))
      .filter((prerequisite): prerequisite is Movie => prerequisite !== undefined);

  return (
    <>
      <PageHeader
        eyebrow="Your catalogue"
        title="Movies"
        description="Add the films you want to revisit, link what must be seen first, and tick them off as you go."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
            Add movie
          </Button>
        }
      />

      {movies.isPending ? (
        <SkeletonRows rows={6} label="Loading movies" />
      ) : movies.isError ? (
        <StateMessage
          icon={RefreshCw}
          title="Could not load movies"
          tone="danger"
          action={
            <Button icon={RefreshCw} onClick={() => void movies.refetch()}>
              Try again
            </Button>
          }
        >
          {movies.error.message}
        </StateMessage>
      ) : all.length === 0 ? (
        <StateMessage
          icon={Film}
          title="No movies yet"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
              Add your first movie
            </Button>
          }
        >
          Start with the films that lead into Avengers: Doomsday, then link the ones that must be
          watched first.
        </StateMessage>
      ) : (
        <section aria-label="Movie list" className={styles.panel}>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={16} aria-hidden />
              <span className="sr-only">Search movies</span>
              <input
                type="search"
                placeholder="Search titles"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <SegmentedControl<Filter>
              label="Filter by watched status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All', count: all.length },
                { value: 'unwatched', label: 'To watch', count: all.length - watchedCount },
                { value: 'watched', label: 'Watched', count: watchedCount },
              ]}
            />
          </div>

          <p className={styles.summary}>
            {pluralize(all.length, 'movie')} · {watchedCount} watched ·{' '}
            {formatRuntime(totalRuntime)} in total
          </p>

          {visible.length === 0 ? (
            <div className={styles.noResults}>
              <SearchX size={18} aria-hidden />
              No movies match these filters.
            </div>
          ) : (
            <ul className={styles.list}>
              {visible.map((movie) => (
                <MovieRow
                  key={movie.id}
                  movie={movie}
                  prerequisites={prerequisitesOf(movie)}
                  onToggleWatched={(watched) => toggleWatched.mutate({ id: movie.id, watched })}
                  onEdit={() => setDialog({ kind: 'edit', movie })}
                  onDelete={() => setDialog({ kind: 'delete', movie })}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {dialog.kind === 'create' && <MovieFormDialog movies={all} onClose={closeDialog} />}
      {dialog.kind === 'edit' && (
        <MovieFormDialog
          key={dialog.movie.id}
          movie={dialog.movie}
          movies={all}
          onClose={closeDialog}
        />
      )}
      {dialog.kind === 'delete' && (
        <DeleteMovieDialog
          movie={dialog.movie}
          dependents={all.filter((movie) => movie.prerequisiteIds.includes(dialog.movie.id))}
          onClose={closeDialog}
        />
      )}
    </>
  );
}
