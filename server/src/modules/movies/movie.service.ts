import { withTransaction, type Db, type Queryable } from '../../db/pool.js';
import { canManage, type Actor } from '../../lib/actor.js';
import { AppError, ErrorCode, notFound } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/pg-errors.js';
import { findCycle, rewatchOrder } from './dependency-graph.js';
import * as repo from './movie.repository.js';
import {
  MOVIE_EPISODES_MESSAGE,
  type CreateMovieInput,
  type UpdateMovieInput,
} from './movie.schemas.js';
import type { Movie, RewatchPlan } from './movie.types.js';

/** API callers without a guest id have full access (see lib/actor.ts). */
const FULL_ACCESS: Actor = { guestId: undefined };

/** Fields only a title's owner may change. */
const DETAIL_FIELDS = [
  'kind',
  'title',
  'releaseYear',
  'runtimeMinutes',
  'episodeCount',
  'tmdbId',
  'posterPath',
] as const;

const forbidden = (message: string) => new AppError(403, ErrorCode.FORBIDDEN, message);

export interface MovieServiceHooks {
  /** Called after a title is created or its title, year or kind changes. */
  onIdentityChanged?: (movie: Movie) => void;
}

export function createMovieService(db: Db, hooks: MovieServiceHooks = {}) {
  return {
    list(): Promise<Movie[]> {
      return repo.listMovies(db);
    },

    async get(id: number): Promise<Movie> {
      const movie = await repo.findMovieById(db, id);
      if (!movie) throw notFound('Movie', id);
      return movie;
    },

    async create(input: CreateMovieInput, actor: Actor = FULL_ACCESS): Promise<Movie> {
      return withTransaction(db, async (tx) => {
        if (input.prerequisiteIds.length > 0) await repo.lockPrerequisiteGraph(tx);
        await assertPrerequisitesExist(tx, input.prerequisiteIds);

        const id = await insertOrConflict(
          () => repo.insertMovie(tx, { ...input, createdBy: actor.guestId ?? null }),
          input.title,
        );

        // A brand-new movie has no dependents yet, so a cycle is impossible
        // here. The check still runs so every write path enforces the same rule.
        await assertNoCycle(tx, id, input.prerequisiteIds);
        await repo.replacePrerequisites(tx, id, input.prerequisiteIds);

        return (await repo.findMovieById(tx, id))!;
      }).then((movie) => {
        hooks.onIdentityChanged?.(movie);
        return movie;
      });
    },

    async update(id: number, patch: UpdateMovieInput, actor: Actor = FULL_ACCESS): Promise<Movie> {
      return withTransaction(db, async (tx) => {
        const { prerequisiteIds, ...fields } = patch;

        if (prerequisiteIds !== undefined) await repo.lockPrerequisiteGraph(tx);
        const current = await repo.lockMovie(tx, id);
        if (!current) throw notFound('Movie', id);
        const currentKind = current.kind;

        // Anyone may tick watched or change what to watch first; only the guest
        // who added a title may change its details.
        const changesDetails = DETAIL_FIELDS.some((field) => patch[field] !== undefined);
        if (changesDetails && !canManage(actor, current.createdBy)) {
          throw forbidden(
            'Only the guest who added this title can change its details. You can still tick it as watched or change what to watch first.',
          );
        }

        // A movie always has one episode: switching to "movie" resets the
        // count, and a movie cannot be given more episodes.
        const nextKind = fields.kind ?? currentKind;
        if (nextKind === 'movie') {
          if (fields.episodeCount !== undefined && fields.episodeCount !== 1) {
            throw new AppError(400, ErrorCode.VALIDATION_ERROR, MOVIE_EPISODES_MESSAGE, [
              { path: 'episodeCount', message: MOVIE_EPISODES_MESSAGE },
            ]);
          }
          if (fields.kind === 'movie') fields.episodeCount = 1;
        }

        if (prerequisiteIds !== undefined) {
          await assertPrerequisitesExist(tx, prerequisiteIds);
          await assertNoCycle(tx, id, prerequisiteIds);
          await repo.replacePrerequisites(tx, id, prerequisiteIds);
        }

        await insertOrConflict(() => repo.updateMovieFields(tx, id, fields), fields.title);

        return (await repo.findMovieById(tx, id))!;
      }).then((movie) => {
        const identityChanged = [patch.title, patch.releaseYear, patch.kind].some(
          (value) => value !== undefined,
        );
        if (identityChanged) hooks.onIdentityChanged?.(movie);
        return movie;
      });
    },

    /**
     * Builds the rewatch plan for `targetId`. The whole catalogue is loaded and
     * ordered in application code (see `rewatchOrder`), which keeps the
     * algorithm hand-written and database-agnostic.
     */
    async rewatchPlan(targetId: number): Promise<RewatchPlan> {
      const all = await repo.listMovies(db);
      const byId = new Map(all.map((movie) => [movie.id, movie]));

      const target = byId.get(targetId);
      if (!target) throw notFound('Movie', targetId);

      const graph = new Map(all.map((movie) => [movie.id, movie.prerequisiteIds]));
      const byReleaseThenTitle = (a: number, b: number) => {
        const left = byId.get(a)!;
        const right = byId.get(b)!;
        return left.releaseYear - right.releaseYear || left.title.localeCompare(right.title);
      };

      const movies = rewatchOrder(graph, targetId, byReleaseThenTitle).map((id) => byId.get(id)!);
      const unwatched = movies.filter((movie) => !movie.watched);

      return {
        target,
        movies,
        totalCount: movies.length,
        watchedCount: movies.length - unwatched.length,
        unwatchedRuntimeMinutes: unwatched.reduce((sum, movie) => sum + watchTime(movie), 0),
      };
    },

    async remove(id: number, actor: Actor = FULL_ACCESS): Promise<void> {
      const movie = await repo.findMovieById(db, id);
      if (!movie) throw notFound('Movie', id);
      if (!canManage(actor, movie.createdBy)) {
        throw forbidden('Only the guest who added this title can delete it.');
      }
      await repo.deleteMovie(db, id);
    },
  };
}

/** Minutes needed to watch a title in full: a movie's runtime, or every episode of a series. */
export function watchTime(movie: Pick<Movie, 'runtimeMinutes' | 'episodeCount'>): number {
  return movie.runtimeMinutes * movie.episodeCount;
}

export type MovieService = ReturnType<typeof createMovieService>;

async function assertPrerequisitesExist(tx: Queryable, ids: readonly number[]): Promise<void> {
  const existing = await repo.findExistingIds(tx, ids);
  const missing = ids.filter((id) => !existing.has(id));
  if (missing.length > 0) {
    throw new AppError(
      400,
      ErrorCode.UNKNOWN_PREREQUISITE,
      `Unknown prerequisite movie id(s): ${missing.join(', ')}.`,
      { missingIds: missing },
    );
  }
}

async function assertNoCycle(tx: Queryable, movieId: number, proposed: number[]): Promise<void> {
  const graph = await repo.loadPrerequisiteGraph(tx);
  const cycle = findCycle(graph, movieId, proposed);
  if (!cycle) return;

  const summaries = await repo.findSummaries(tx, cycle);
  const path = cycle.map((id) => summaries.get(id) ?? { id, title: `#${id}` });
  throw new AppError(
    409,
    ErrorCode.CIRCULAR_DEPENDENCY,
    `This would make a movie depend on itself: ${path.map((movie) => movie.title).join(' → ')}.`,
    { cycle: path },
  );
}

async function insertOrConflict<T>(write: () => Promise<T>, title: string | undefined): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error, repo.TITLE_UNIQUE_INDEX)) {
      throw new AppError(
        409,
        ErrorCode.DUPLICATE_TITLE,
        `A movie titled "${title}" already exists.`,
      );
    }
    throw error;
  }
}
