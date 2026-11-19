import { Router } from 'express';
import { bookingQuerySchema, cinemaIdParam, createCinemaSchema } from './cinema.schemas.js';
import type { CinemaService } from './cinema.service.js';

export function cinemaRoutes(cinemas: CinemaService): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await cinemas.list());
  });

  router.post('/', async (req, res) => {
    const input = createCinemaSchema.parse(req.body);
    res.status(201).json(await cinemas.create(input));
  });

  router.get('/:id', async (req, res) => {
    const { id } = cinemaIdParam.parse(req.params);
    res.json(await cinemas.get(id));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = cinemaIdParam.parse(req.params);
    await cinemas.remove(id);
    res.status(204).end();
  });

  router.get('/:id/booking', async (req, res) => {
    const { id } = cinemaIdParam.parse(req.params);
    const { groupSize } = bookingQuerySchema.parse(req.query);
    res.json(await cinemas.quote(id, groupSize));
  });

  return router;
}
