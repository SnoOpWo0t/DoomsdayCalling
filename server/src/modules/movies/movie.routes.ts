import { Router } from 'express';
import { actorFrom } from '../../lib/actor.js';
import { createMovieSchema, movieIdParam, updateMovieSchema } from './movie.schemas.js';
import type { MetadataService } from '../metadata/metadata.service.js';
import type { MovieService } from './movie.service.js';
import { presentMovie } from './movie.presenter.js';
import type { Movie } from './movie.types.js';

const byReleaseThenTitle = (a: Movie, b: Movie) =>
  a.releaseYear - b.releaseYear || a.title.localeCompare(b.title);

export function movieRoutes(movies: MovieService, metadata: MetadataService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const actor = actorFrom(req);
    res.json((await movies.list()).map((movie) => presentMovie(movie, actor)));
  });

  router.post('/', async (req, res) => {
    const actor = actorFrom(req);
    const input = createMovieSchema.parse(req.body);
    res.status(201).json(presentMovie(await movies.create(input, actor), actor));
  });

  router.get('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    res.json(presentMovie(await movies.get(id), actorFrom(req)));
  });

  /**
   * Everything the details page needs in one request: the title, what to
   * watch before it, what it unlocks, and external details (poster,
   * overview, genres, rating). External details are best effort: if every
   * source is unreachable the page still works with `metadata: null`.
   */
  router.get('/:id/details', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    const actor = actorFrom(req);
    const present = (title: Movie) => presentMovie(title, actor);
    const movie = await movies.get(id);
    const all = await movies.list();
    const prerequisiteIds = new Set(movie.prerequisiteIds);

    res.json({
      movie: present(movie),
      prerequisites: all
        .filter((other) => prerequisiteIds.has(other.id))
        .sort(byReleaseThenTitle)
        .map(present),
      dependents: all
        .filter((other) => other.prerequisiteIds.includes(movie.id))
        .sort(byReleaseThenTitle)
        .map(present),
      metadata: await metadata.get(movie).catch(() => null),
    });
  });

  router.get('/:id/rewatch-order', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    const actor = actorFrom(req);
    const plan = await movies.rewatchPlan(id);
    res.json({
      ...plan,
      target: presentMovie(plan.target, actor),
      movies: plan.movies.map((movie) => presentMovie(movie, actor)),
    });
  });

  router.patch('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    const actor = actorFrom(req);
    const patch = updateMovieSchema.parse(req.body);
    res.json(presentMovie(await movies.update(id, patch, actor), actor));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = movieIdParam.parse(req.params);
    await movies.remove(id, actorFrom(req));
    res.status(204).end();
  });

  return router;
}
