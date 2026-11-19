import { Router } from 'express';
import { createMovieSchema, movieIdParam, updateMovieSchema } from './movie.schemas.js';
import type { MovieService } from './movie.service.js';

export function movieRoutes(movies: MovieService): Router {
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
