import { Router } from 'express';
import { createMovieSchema, movieIdParam, updateMovieSchema } from './movie.schemas.js';
import type { MetadataService } from '../metadata/metadata.service.js';
import type { MovieService } from './movie.service.js';
import type { Movie } from './movie.types.js';

const byReleaseThenTitle = (a: Movie, b: Movie) =>
  a.releaseYear - b.releaseYear || a.title.localeCompare(b.title);

export function movieRoutes(movies: MovieService, metadata: MetadataService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await movies.list());
  });

  router.post('/', async (req, res) => {
    const input = createMovieSchema.parse(req.body);
    res.status(201).json(await movies.create(input));
  });

  router.get('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    res.json(await movies.get(id));
  });

  /**
   * Everything the details page needs in one request: the title, what to
   * watch before it, what it unlocks, and external details (poster,
   * overview, genres, rating). External details are best effort: if every
   * source is unreachable the page still works with `metadata: null`.
   */
  router.get('/:id/details', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    const movie = await movies.get(id);
    const all = await movies.list();
    const prerequisiteIds = new Set(movie.prerequisiteIds);

    res.json({
      movie,
      prerequisites: all.filter((other) => prerequisiteIds.has(other.id)).sort(byReleaseThenTitle),
      dependents: all
        .filter((other) => other.prerequisiteIds.includes(movie.id))
        .sort(byReleaseThenTitle),
      metadata: await metadata.get(movie).catch(() => null),
    });
  });

  router.get('/:id/rewatch-order', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    res.json(await movies.rewatchPlan(id));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    const patch = updateMovieSchema.parse(req.body);
    res.json(await movies.update(id, patch));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    await movies.remove(id);
    res.status(204).end();
  });

  return router;
}
