import { Router } from 'express';
import { actorFrom } from '../../lib/actor.js';
import {
  createReservationSchema,
  reservationIdParam,
  type ReservationService,
} from './reservation.service.js';

export function reservationRoutes(reservations: ReservationService): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    res.json(await reservations.list(actorFrom(req)));
  });

  router.post('/', async (req, res) => {
    const actor = actorFrom(req);
    const input = createReservationSchema.parse(req.body);
    res.status(201).json(await reservations.create(input, actor));
  });

  router.delete('/:id', async (req, res) => {
    const { id } = reservationIdParam.parse(req.params);
    await reservations.cancel(id, actorFrom(req));
    res.status(204).end();
  });

  return router;
}
