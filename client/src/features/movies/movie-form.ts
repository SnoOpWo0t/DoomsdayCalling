import type { Movie, MovieInput, TitleKind } from '../../api/types';
import { LIMITS } from '../../lib/constants';

/** Raw form state: numbers stay strings until submit so partial input is allowed. */
export interface MovieFormValues {
  kind: TitleKind;
  title: string;
  releaseYear: string;
  runtimeMinutes: string;
  episodeCount: string;
  watched: boolean;
  prerequisiteIds: number[];
  tmdbId: number | null;
  posterPath: string | null;
}

export type MovieFormErrors = Partial<
  Record<'title' | 'releaseYear' | 'runtimeMinutes' | 'episodeCount', string>
>;

export function initialValues(movie?: Movie): MovieFormValues {
  return {
    kind: movie?.kind ?? 'movie',
    title: movie?.title ?? '',
    releaseYear: movie ? String(movie.releaseYear) : '',
    runtimeMinutes: movie ? String(movie.runtimeMinutes) : '',
    episodeCount: movie && movie.kind === 'series' ? String(movie.episodeCount) : '',
    watched: movie?.watched ?? false,
    prerequisiteIds: movie?.prerequisiteIds ?? [],
    tmdbId: movie?.tmdbId ?? null,
    posterPath: movie?.posterPath ?? null,
  };
}

const isWholeNumber = (value: string) => /^\d+$/.test(value.trim());

/**
 * Mirrors the API's rules for instant feedback. The server remains the
 * authority (uniqueness and cycles can only be checked there).
 */
export function validateMovieForm(values: MovieFormValues): MovieFormErrors {
  const errors: MovieFormErrors = {};
  const { releaseYear, runtime, episodes } = LIMITS;

  if (values.title.trim().length === 0) errors.title = 'Give it a title.';
  else if (values.title.trim().length > 200) errors.title = 'Keep the title under 200 characters.';

  const year = Number(values.releaseYear);
  if (!isWholeNumber(values.releaseYear) || year < releaseYear.min || year > releaseYear.max) {
    errors.releaseYear = `Enter a year between ${releaseYear.min} and ${releaseYear.max}.`;
  }

  const minutes = Number(values.runtimeMinutes);
  if (!isWholeNumber(values.runtimeMinutes) || minutes < runtime.min || minutes > runtime.max) {
    errors.runtimeMinutes = `Runtime must be ${runtime.min}-${runtime.max} minutes.`;
  }

  if (values.kind === 'series') {
    const count = Number(values.episodeCount);
    if (!isWholeNumber(values.episodeCount) || count < episodes.min || count > episodes.max) {
      errors.episodeCount = `Enter ${episodes.min}-${episodes.max} episodes.`;
    }
  }

  return errors;
}

export function toMovieInput(values: MovieFormValues): Required<MovieInput> {
  return {
    kind: values.kind,
    title: values.title.trim(),
    releaseYear: Number(values.releaseYear),
    runtimeMinutes: Number(values.runtimeMinutes),
    episodeCount: values.kind === 'series' ? Number(values.episodeCount) : 1,
    watched: values.watched,
    prerequisiteIds: values.prerequisiteIds,
    tmdbId: values.tmdbId,
    posterPath: values.posterPath,
  };
}
