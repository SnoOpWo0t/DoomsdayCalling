import { ArrowRight, Ticket } from 'lucide-react';
import { Link } from 'react-router';
import type { Movie } from '../../api/types';
import { Poster } from '../../components/ui/Poster';
import { WatchToggle } from '../../components/ui/WatchToggle';
import { SeriesBadge } from '../../components/ui/SeriesBadge';
import { describeLength } from '../../lib/format';
import styles from './PlanTimeline.module.css';

export interface PlanTimelineProps {
  movies: Movie[];
  target: Movie;
  onToggleWatched: (movie: Movie, watched: boolean) => void;
}

/**
 * The rewatch order as numbered steps. Every movie appears after all of its
 * prerequisites (guaranteed by the API); the first unwatched one is flagged
 * as "up next", and the list ends at the target itself.
 */
export function PlanTimeline({ movies, target, onToggleWatched }: PlanTimelineProps) {
  const nextUpId = movies.find((movie) => !movie.watched)?.id;
  // Only titles that have not come out yet have an opening night to book.
  const upcoming = target.releaseYear >= new Date().getFullYear();

  return (
    <ol className={styles.timeline} aria-label={`Rewatch order for ${target.title}`}>
      {movies.map((movie, index) => {
        const isNext = movie.id === nextUpId;
        return (
          <li
            key={movie.id}
            className={styles.step}
            data-watched={movie.watched}
            data-next={isNext || undefined}
          >
            <span className={styles.number} aria-hidden>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className={styles.card}>
              <WatchToggle
                watched={movie.watched}
                title={movie.title}
                onChange={(watched) => onToggleWatched(movie, watched)}
              />
              <Poster
                title={movie.title}
                posterPath={movie.posterPath}
                posterUrl={movie.posterUrl}
                size="xs"
              />
              <div className={styles.info}>
                <p className={styles.title}>
                  <Link to={`/titles/${movie.id}`} className={styles.titleLink}>
                    {movie.title}
                  </Link>
                  {movie.kind === 'series' && <SeriesBadge />}
                  {isNext && <span className={styles.nextBadge}>Up next</span>}
                </p>
                <p className={styles.meta}>
                  {movie.releaseYear} · {describeLength(movie)}
                  {movie.watched && <span className="sr-only"> (watched)</span>}
                </p>
              </div>
            </div>
          </li>
        );
      })}

      <li className={`${styles.step} ${styles.finale}`}>
        <span className={styles.number} aria-hidden>
          <Ticket size={16} />
        </span>
        <div className={styles.card}>
          <div className={styles.info}>
            <p className={styles.title}>{target.title}</p>
            <p className={styles.meta}>
              {upcoming ? 'Opening night. Watch it together.' : 'Then press play on this one.'}
            </p>
          </div>
          {upcoming && (
            <Link to="/booking" className={styles.bookLink}>
              Book seats <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </div>
      </li>
    </ol>
  );
}
