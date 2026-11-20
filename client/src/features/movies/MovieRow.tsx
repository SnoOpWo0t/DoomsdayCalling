import { Link2, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { Movie } from '../../api/types';
import { IconButton } from '../../components/ui/Button';
import { Poster } from '../../components/ui/Poster';
import { WatchToggle } from '../../components/ui/WatchToggle';
import { SeriesBadge } from '../../components/ui/SeriesBadge';
import { describeLength } from '../../lib/format';
import styles from './MovieRow.module.css';

export interface MovieRowProps {
  movie: Movie;
  prerequisites: Movie[];
  onToggleWatched: (watched: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MovieRow({
  movie,
  prerequisites,
  onToggleWatched,
  onEdit,
  onDelete,
}: MovieRowProps) {
  return (
    <li className={styles.row} data-watched={movie.watched}>
      <Link to={`/titles/${movie.id}`} className={styles.posterLink} tabIndex={-1} aria-hidden>
        <Poster
          title={movie.title}
          posterPath={movie.posterPath}
          posterUrl={movie.posterUrl}
          size="xs"
        />
      </Link>

      <div className={styles.info}>
        <h3 className={styles.title}>
          <Link to={`/titles/${movie.id}`} className={styles.titleLink}>
            {movie.title}
          </Link>{' '}
          {movie.kind === 'series' && <SeriesBadge />}
        </h3>
        <p className={styles.meta}>
          <span>{movie.releaseYear}</span>
          <span aria-hidden>·</span>
          <span>{describeLength(movie)}</span>
          {movie.addedByYou && (
            <>
              <span aria-hidden>·</span>
              <span className={styles.yours}>Added by you</span>
            </>
          )}
        </p>
        <p className={styles.prerequisites}>
          <Link2 size={14} aria-hidden />
          {prerequisites.length === 0 ? (
            <span className={styles.none}>No prerequisites</span>
          ) : (
            <span>
              <span className="sr-only">Watch first: </span>
              {prerequisites.map((prerequisite) => prerequisite.title).join(', ')}
            </span>
          )}
        </p>
      </div>

      <div className={styles.actions}>
        <WatchToggle watched={movie.watched} title={movie.title} onChange={onToggleWatched} />
        <IconButton icon={Pencil} label={`Edit ${movie.title}`} onClick={onEdit} />
        {movie.canEdit && (
          <IconButton
            icon={Trash2}
            label={`Delete ${movie.title}`}
            variant="danger"
            onClick={onDelete}
          />
        )}
      </div>
    </li>
  );
}
