import { Link2Off, Save } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useCreateMovie, useTmdbStatus, useUpdateMovie } from '../../api/queries';
import type { Movie, TmdbMovieDetails } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { TextField } from '../../components/ui/Field';
import { Poster } from '../../components/ui/Poster';
import { LIMITS } from '../../lib/constants';
import { CycleAlert } from './CycleAlert';
import {
  initialValues,
  toMovieInput,
  validateMovieForm,
  type MovieFormErrors,
  type MovieFormValues,
} from './movie-form';
import styles from './MovieFormDialog.module.css';
import { PrerequisitePicker } from './PrerequisitePicker';
import { TmdbLookup } from './TmdbLookup';

export interface MovieFormDialogProps {
  /** Movie to edit; omit to create a new one. */
  movie?: Movie;
  movies: Movie[];
  onClose: () => void;
}

export function MovieFormDialog({ movie, movies, onClose }: MovieFormDialogProps) {
  const isEdit = movie !== undefined;
  const [values, setValues] = useState<MovieFormValues>(() => initialValues(movie));
  const [errors, setErrors] = useState<MovieFormErrors>({});
  const [serverError, setServerError] = useState<ApiError | null>(null);

  const tmdbStatus = useTmdbStatus();
  const createMovie = useCreateMovie();
  const updateMovie = useUpdateMovie();
  const saving = createMovie.isPending || updateMovie.isPending;

  const candidates = useMemo(
    () => movies.filter((candidate) => candidate.id !== movie?.id),
    [movies, movie?.id],
  );

  const set = <K extends keyof MovieFormValues>(key: K, value: MovieFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const applyTmdb = (details: TmdbMovieDetails) => {
    setValues((current) => ({
      ...current,
      title: details.title,
      releaseYear: details.releaseYear ? String(details.releaseYear) : current.releaseYear,
      runtimeMinutes: details.runtimeMinutes
        ? String(Math.min(details.runtimeMinutes, LIMITS.runtime.max))
        : current.runtimeMinutes,
      tmdbId: details.tmdbId,
      posterPath: details.posterPath,
    }));
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validateMovieForm(values);
    setErrors(found);
    setServerError(null);
    if (Object.keys(found).length > 0) return;

    const input = toMovieInput(values);
    try {
      if (isEdit) await updateMovie.mutateAsync({ id: movie.id, patch: input });
      else await createMovie.mutateAsync(input);
      onClose();
    } catch (caught) {
      if (!(caught instanceof ApiError)) throw caught;
      if (caught.code === 'DUPLICATE_TITLE') setErrors({ title: caught.message });
      else if (caught.code === 'VALIDATION_ERROR') setErrors(caught.fieldErrors);
      else setServerError(caught);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={isEdit ? 'Edit movie' : 'Add a movie'}
      description={
        isEdit
          ? 'Changing prerequisites updates every rewatch plan that includes this movie.'
          : 'Add a film to your catalogue and link what should be watched before it.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="movie-form" icon={Save} loading={saving}>
            {isEdit ? 'Save changes' : 'Add movie'}
          </Button>
        </>
      }
    >
      <form id="movie-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        {tmdbStatus.data?.enabled && <TmdbLookup onPick={applyTmdb} />}

        <div className={styles.identity}>
          <Poster title={values.title || '?'} posterPath={values.posterPath} size="sm" />
          <TextField
            label="Title"
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            error={errors.title}
            maxLength={200}
            autoFocus={!tmdbStatus.data?.enabled}
            required
            fieldClassName={styles.titleField}
          />
        </div>

        {values.tmdbId !== null && (
          <p className={styles.linked}>
            Linked to TMDb #{values.tmdbId}
            <Button
              size="sm"
              variant="ghost"
              icon={Link2Off}
              onClick={() =>
                setValues((current) => ({ ...current, tmdbId: null, posterPath: null }))
              }
            >
              Unlink
            </Button>
          </p>
        )}

        <div className={styles.row}>
          <TextField
            label="Release year"
            inputMode="numeric"
            value={values.releaseYear}
            onChange={(event) => set('releaseYear', event.target.value)}
            error={errors.releaseYear}
            placeholder="2012"
            required
          />
          <TextField
            label="Runtime (minutes)"
            inputMode="numeric"
            value={values.runtimeMinutes}
            onChange={(event) => set('runtimeMinutes', event.target.value)}
            error={errors.runtimeMinutes}
            hint={`${LIMITS.runtime.min}-${LIMITS.runtime.max}`}
            placeholder="143"
            required
          />
        </div>

        <PrerequisitePicker
          movies={candidates}
          selectedIds={values.prerequisiteIds}
          onChange={(ids) => set('prerequisiteIds', ids)}
        />

        {!isEdit && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={values.watched}
              onChange={(event) => set('watched', event.target.checked)}
            />
            I have already watched it
          </label>
        )}

        {serverError?.cycle && <CycleAlert cycle={serverError.cycle} />}
        {serverError && !serverError.cycle && <Alert reveal>{serverError.message}</Alert>}
      </form>
    </Dialog>
  );
}
