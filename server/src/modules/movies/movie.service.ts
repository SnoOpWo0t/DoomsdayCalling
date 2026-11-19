import { withTransaction, type Db, type Queryable } from '../../db/pool.js';
import { AppError, ErrorCode, notFound } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/pg-errors.js';
import { findCycle } from './dependency-graph.js';
import * as repo from './movie.repository.js';
import type { CreateMovieInput, UpdateMovieInput } from './movie.schemas.js';
import type { Movie } from './movie.types.js';

export function createMovieService(db: Db) {
  return {
    list(): Promise<Movie[]> {
      return repo.listMovies(db);
    },

    async get(id: number): Promise<Movie> {
      const movie = await repo.findMovieById(db, id);
      if (!movie) throw notFound('Movie', id);
      return movie;
    },

    async create(input: CreateMovieInput): Promise<Movie> {
      return withTransaction(db, async (tx) => {
        if (input.prerequisiteIds.length > 0) await repo.lockPrerequisiteGraph(tx);
        await assertPrerequisitesExist(tx, input.prerequisiteIds);

        const id = await insertOrConflict(() => repo.insertMovie(tx, input), input.title);

        // A brand-new movie has no dependents yet, so a cycle is impossible
        // here. The check still runs so every write path enforces the same rule.
        await assertNoCycle(tx, id, input.prerequisiteIds);
        await repo.replacePrerequisites(tx, id, input.prerequisiteIds);

        return (await repo.findMovieById(tx, id))!;
      });
    },

    async update(id: number, patch: UpdateMovieInput): Promise<Movie> {
      return withTransaction(db, async (tx) => {
        const { prerequisiteIds, ...fields } = patch;

        if (prerequisiteIds !== undefined) await repo.lockPrerequisiteGraph(tx);
        if (!(await repo.lockMovie(tx, id))) throw notFound('Movie', id);

        if (prerequisiteIds !== undefined) {
          await assertPrerequisitesExist(tx, prerequisiteIds);
          await assertNoCycle(tx, id, prerequisiteIds);
          await repo.replacePrerequisites(tx, id, prerequisiteIds);
        }

        await insertOrConflict(() => repo.updateMovieFields(tx, id, fields), fields.title);

        return (await repo.findMovieById(tx, id))!;
      });
    },

    async remove(id: number): Promise<void> {
      const deleted = await repo.deleteMovie(db, id);
      if (!deleted) throw notFound('Movie', id);
    },
  };
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
