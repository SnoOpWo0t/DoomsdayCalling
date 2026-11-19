import { Trash2 } from 'lucide-react';
import { ApiError } from '../../api/client';
import { useDeleteMovie } from '../../api/queries';
import type { Movie } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';

export interface DeleteMovieDialogProps {
  movie: Movie;
  dependents: Movie[];
  onClose: () => void;
}

export function DeleteMovieDialog({ movie, dependents, onClose }: DeleteMovieDialogProps) {
  const deleteMovie = useDeleteMovie();

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Delete ${movie.kind}?`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Keep it
          </Button>
          <Button
            variant="danger"
            icon={Trash2}
            loading={deleteMovie.isPending}
            onClick={() => deleteMovie.mutate(movie.id, { onSuccess: onClose })}
          >
            Delete
          </Button>
        </>
      }
    >
      <p>
        <strong>{movie.title}</strong> will be removed from your catalogue.
        {dependents.length > 0 &&
          ` It will also be removed as a prerequisite of ${dependents
            .map((dependent) => dependent.title)
            .join(', ')}.`}
      </p>
      {deleteMovie.error && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Alert>
            {deleteMovie.error instanceof ApiError
              ? deleteMovie.error.message
              : 'Could not delete the movie.'}
          </Alert>
        </div>
      )}
    </Dialog>
  );
}
