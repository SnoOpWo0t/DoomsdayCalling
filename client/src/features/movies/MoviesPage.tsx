import { Film, Plus, RefreshCw, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMovies, useToggleWatched } from '../../api/queries';
import type { Movie, TitleKind } from '../../api/types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StateMessage } from '../../components/ui/StateMessage';
import { formatRuntime, pluralize, watchTime } from '../../lib/format';
import { DeleteMovieDialog } from './DeleteMovieDialog';
import { MovieFormDialog } from './MovieFormDialog';
import { MovieRow } from './MovieRow';
import styles from './MoviesPage.module.css';

type Filter = 'all' | 'unwatched' | 'watched';
type KindFilter = 'all' | TitleKind;

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
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
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
        (kindFilter === 'all' || movie.kind === kindFilter) &&
        movie.title.toLowerCase().includes(needle),
    );
  }, [all, filter, kindFilter, search]);

  const watchedCount = all.filter((movie) => movie.watched).length;
  const seriesCount = all.filter((movie) => movie.kind === 'series').length;
  const totalRuntime = all.reduce((sum, movie) => sum + watchTime(movie), 0);
  const prerequisitesOf = (movie: Movie) =>
    movie.prerequisiteIds
      .map((id) => byId.get(id))
      .filter((prerequisite): prerequisite is Movie => prerequisite !== undefined);

  return (
    <>
      <PageHeader
        eyebrow="Your catalogue"
        title="Movies & series"
        description="Add the movies and series you want to revisit, link what must be seen first, and tick them off as you go."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
            Add title
          </Button>
        }
      />

      {movies.isPending ? (
        <SkeletonRows rows={6} label="Loading titles" />
      ) : movies.isError ? (
        <StateMessage
          icon={RefreshCw}
          title="Could not load titles"
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
          title="Nothing here yet"
          action={
            <Button variant="primary" icon={Plus} onClick={() => setDialog({ kind: 'create' })}>
              Add your first title
            </Button>
          }
        >
          Start with the films that lead into Avengers: Doomsday, then link the ones that must be
          watched first.
        </StateMessage>
      ) : (
        <section aria-label="Catalogue" className={styles.panel}>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={16} aria-hidden />
              <span className="sr-only">Search titles</span>
              <input
                type="search"
                placeholder="Search titles"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <SegmentedControl<KindFilter>
              label="Filter by type"
              value={kindFilter}
              onChange={setKindFilter}
              options={[
                { value: 'all', label: 'All', count: all.length },
                { value: 'movie', label: 'Movies', count: all.length - seriesCount },
                { value: 'series', label: 'Series', count: seriesCount },
              ]}
            />
            <SegmentedControl<Filter>
              label="Filter by watched status"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'unwatched', label: 'To watch', count: all.length - watchedCount },
                { value: 'watched', label: 'Watched', count: watchedCount },
              ]}
            />
          </div>

          <p className={styles.summary}>
            {pluralize(all.length - seriesCount, 'movie')} ·{' '}
            {pluralize(seriesCount, 'series', 'series')} · {watchedCount} watched ·{' '}
            {formatRuntime(totalRuntime)} in total
          </p>

          {visible.length === 0 ? (
            <div className={styles.noResults}>
              <SearchX size={18} aria-hidden />
              Nothing matches these filters.
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
