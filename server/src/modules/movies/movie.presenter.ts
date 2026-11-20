import { canManage, type Actor } from '../../lib/actor.js';
import type { Movie, MovieDto } from './movie.types.js';

/** Hides who added a title and tells the caller what they may do with it. */
export function presentMovie(movie: Movie, actor: Actor): MovieDto {
  const { createdBy, ...rest } = movie;
  return {
    ...rest,
    canEdit: canManage(actor, createdBy),
    addedByYou: actor.guestId !== undefined && actor.guestId === createdBy,
  };
}
