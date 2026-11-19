import {
  ArrowLeft,
  CircleCheck,
  Circle,
  Clock,
  ExternalLink,
  Film,
  ListOrdered,
  Pencil,
  SearchX,
  Star,
  Ticket,
  Tv,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../../api/client';
import { useMovies, useTitleDetails, useToggleWatched } from '../../api/queries';
import type { Movie, TitleMetadata } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { Poster } from '../../components/ui/Poster';
import { StateMessage } from '../../components/ui/StateMessage';
import { describeLength } from '../../lib/format';
import { MovieFormDialog } from '../movies/MovieFormDialog';
import styles from './TitlePage.module.css';

const SOURCE_NAMES: Record<TitleMetadata['source'], string> = {
  tmdb: 'TMDb',
  tvmaze: 'TVMaze',
  wikipedia: 'Wikipedia',
};

export function TitlePage() {
  const id = Number(useParams().id);
  const validId = Number.isInteger(id) && id > 0 ? id : undefined;
  const details = useTitleDetails(validId);
  const movies = useMovies();
  const toggleWatched = useToggleWatched();
  const [editing, setEditing] = useState(false);

  const back = (
    <Link to="/" className={styles.back}>
      <ArrowLeft size={16} aria-hidden /> Movies &amp; series
    </Link>
  );

  if (details.isPending && validId !== undefined) {
    return (
      <>
        {back}
        <div className={styles.loading} role="status" aria-label="Loading title">
          <span className={styles.loadingPoster} />
          <span className={styles.loadingLines}>
            <span />
            <span />
            <span />
          </span>
        </div>
      </>
    );
  }

  if (validId === undefined || details.isError) {
    const notFound =
      validId === undefined || (details.error instanceof ApiError && details.error.status === 404);
    return (
      <>
        {back}
        <StateMessage
          icon={SearchX}
          title={notFound ? 'Title not found' : 'Could not load this title'}
          tone={notFound ? 'neutral' : 'danger'}
        >
          {notFound
            ? 'It may have been deleted.'
            : details.error instanceof Error
              ? details.error.message
              : null}
        </StateMessage>
      </>
    );
  }

  const { movie, prerequisites, dependents, metadata } = details.data!;
  const upcoming = movie.releaseYear >= new Date().getFullYear();
  const heroImage = metadata?.backdropUrl ?? metadata?.posterLargeUrl ?? metadata?.posterUrl;
  const KindIcon = movie.kind === 'series' ? Tv : Film;

  return (
    <article className={styles.page}>
      {back}

      <header className={styles.hero}>
        {heroImage && (
          <div
            className={styles.backdrop}
            style={{ backgroundImage: `url("${heroImage}")` }}
            aria-hidden
          />
        )}

        <div className={styles.posterColumn}>
          <Poster
            title={movie.title}
            posterPath={movie.posterPath}
            posterUrl={metadata?.posterLargeUrl ?? metadata?.posterUrl ?? movie.posterUrl}
            size="lg"
          />
        </div>

        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            <KindIcon size={14} aria-hidden />
            {movie.kind === 'series' ? 'Series' : 'Movie'} · {movie.releaseYear}
            {upcoming && <span className={styles.upcoming}>Upcoming</span>}
          </p>
          <h1 className={styles.title}>{movie.title}</h1>

          <ul className={styles.facts}>
            <li>
              <Clock size={16} aria-hidden />
              {describeLength(movie)}
            </li>
            {metadata?.rating !== null && metadata?.rating !== undefined && (
              <li>
                <Star size={16} aria-hidden />
                {metadata.rating.toFixed(1)}
                <span className={styles.outOf}>/ 10</span>
              </li>
            )}
          </ul>

          {metadata && metadata.genres.length > 0 && (
            <ul className={styles.genres} aria-label="Genres">
              {metadata.genres.map((genre) => (
                <li key={genre}>{genre}</li>
              ))}
            </ul>
          )}

          <div className={styles.actions}>
            <Button
              variant={movie.watched ? 'secondary' : 'primary'}
              icon={movie.watched ? CircleCheck : Circle}
              aria-pressed={movie.watched}
              onClick={() => toggleWatched.mutate({ id: movie.id, watched: !movie.watched })}
            >
              {movie.watched ? 'Watched' : 'Mark as watched'}
            </Button>
            <Button icon={Pencil} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Link to={`/plan?target=${movie.id}`} className={styles.linkButton}>
              <ListOrdered size={16} aria-hidden /> Rewatch plan
            </Link>
            {upcoming && (
              <Link to="/booking" className={styles.linkButton}>
                <Ticket size={16} aria-hidden /> Book opening night
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className={styles.overview} aria-labelledby="overview-heading">
        <h2 id="overview-heading" className={styles.sectionTitle}>
          Overview
        </h2>
        {metadata?.overview ? (
          <p className={styles.overviewText}>{metadata.overview}</p>
        ) : (
          <p className={styles.muted}>No overview found for this title yet.</p>
        )}
        {metadata?.externalUrl && (
          <a
            href={metadata.externalUrl}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.source}
          >
            Details from {SOURCE_NAMES[metadata.source]}
            <ExternalLink size={14} aria-hidden />
          </a>
        )}
      </section>

      <div className={styles.related}>
        <RelatedList
          title="Watch these first"
          empty="Nothing. You can start here."
          movies={prerequisites}
        />
        <RelatedList
          title="Unlocks next"
          empty="Nothing in your catalogue builds on this yet."
          movies={dependents}
        />
      </div>

      {editing && movies.data && (
        <MovieFormDialog movie={movie} movies={movies.data} onClose={() => setEditing(false)} />
      )}
    </article>
  );
}

function RelatedList({ title, empty, movies }: { title: string; empty: string; movies: Movie[] }) {
  return (
    <section className={styles.relatedSection} aria-label={title}>
      <h2 className={styles.sectionTitle}>
        {title}
        <span className={styles.count}>{movies.length}</span>
      </h2>
      {movies.length === 0 ? (
        <p className={styles.muted}>{empty}</p>
      ) : (
        <ul className={styles.relatedList}>
          {movies.map((movie) => (
            <li key={movie.id}>
              <Link to={`/titles/${movie.id}`} className={styles.relatedItem}>
                <Poster
                  title={movie.title}
                  posterPath={movie.posterPath}
                  posterUrl={movie.posterUrl}
                  size="xs"
                />
                <span className={styles.relatedText}>
                  <span className={styles.relatedTitle}>{movie.title}</span>
                  <span className={styles.relatedMeta}>
                    {movie.releaseYear} · {describeLength(movie)}
                  </span>
                </span>
                {movie.watched ? (
                  <CircleCheck size={18} className={styles.watchedIcon} aria-label="Watched" />
                ) : (
                  <Circle size={18} className={styles.unwatchedIcon} aria-label="Not watched" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
