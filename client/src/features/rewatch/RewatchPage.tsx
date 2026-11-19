import { Film, CircleCheck, RefreshCw, Sparkles, Ticket } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMovies, useRewatchPlan, useToggleWatched } from '../../api/queries';
import type { Movie } from '../../api/types';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { SelectField } from '../../components/ui/Field';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { StateMessage } from '../../components/ui/StateMessage';
import { PlanSummary } from './PlanSummary';
import { PlanTimeline } from './PlanTimeline';
import styles from './RewatchPage.module.css';

/** Default target: the most recent release (Avengers: Doomsday with the sample data). */
function defaultTarget(movies: Movie[]): Movie | undefined {
  return movies.reduce<Movie | undefined>(
    (latest, movie) => (!latest || movie.releaseYear >= latest.releaseYear ? movie : latest),
    undefined,
  );
}

export function RewatchPage() {
  const movies = useMovies();
  const toggleWatched = useToggleWatched();
  const [params, setParams] = useSearchParams();

  const all = useMemo(() => movies.data ?? [], [movies.data]);
  const requestedId = Number(params.get('target'));
  const targetId = all.some((movie) => movie.id === requestedId)
    ? requestedId
    : defaultTarget(all)?.id;

  const plan = useRewatchPlan(targetId);
  const options = useMemo(
    () => [...all].sort((a, b) => a.releaseYear - b.releaseYear || a.title.localeCompare(b.title)),
    [all],
  );

  const header = (
    <PageHeader
      eyebrow="Catch up"
      title="Rewatch plan"
      description="Pick a target and see every film you need first, ordered so each one comes after the films it builds on."
    />
  );

  if (movies.isPending) {
    return (
      <>
        {header}
        <SkeletonRows rows={5} label="Loading movies" />
      </>
    );
  }

  if (movies.isError) {
    return (
      <>
        {header}
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
      </>
    );
  }

  if (all.length === 0 || targetId === undefined) {
    return (
      <>
        {header}
        <StateMessage
          icon={Film}
          title="No movies to plan"
          action={
            <Link to="/" className={styles.link}>
              Add movies first
            </Link>
          }
        >
          A rewatch plan is built from your catalogue and its prerequisites.
        </StateMessage>
      </>
    );
  }

  const data = plan.data;
  const allWatched =
    data !== undefined && data.totalCount > 0 && data.watchedCount === data.totalCount;

  return (
    <>
      {header}

      <div className={styles.controls}>
        <SelectField
          label="Target movie"
          value={targetId}
          onChange={(event) => setParams({ target: event.target.value }, { replace: true })}
          fieldClassName={styles.select}
        >
          {options.map((movie) => (
            <option key={movie.id} value={movie.id}>
              {movie.title} ({movie.releaseYear})
            </option>
          ))}
        </SelectField>
      </div>

      {plan.isError ? (
        <StateMessage
          icon={RefreshCw}
          title="Could not build the plan"
          tone="danger"
          action={
            <Button icon={RefreshCw} onClick={() => void plan.refetch()}>
              Try again
            </Button>
          }
        >
          {plan.error.message}
        </StateMessage>
      ) : !data ? (
        <SkeletonRows rows={5} label="Building plan" />
      ) : (
        <div className={styles.plan} aria-busy={plan.isPlaceholderData || undefined}>
          <PlanSummary plan={data} />

          {data.totalCount === 0 ? (
            <StateMessage icon={Sparkles} title="Nothing to catch up on">
              {data.target.title} does not build on any other movie in your catalogue. Go straight
              in.
            </StateMessage>
          ) : (
            <>
              {allWatched && (
                <StateMessage
                  icon={CircleCheck}
                  title="You are ready"
                  tone="success"
                  action={
                    <Link to="/booking" className={styles.link}>
                      <Ticket size={16} aria-hidden /> Book the watch party
                    </Link>
                  }
                >
                  Every film before {data.target.title} is watched.
                </StateMessage>
              )}
              <PlanTimeline
                movies={data.movies}
                target={data.target}
                onToggleWatched={(movie, watched) =>
                  toggleWatched.mutate({ id: movie.id, watched })
                }
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
