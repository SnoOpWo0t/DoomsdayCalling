import { randomInt } from 'node:crypto';
import { z } from 'zod';
import type { Db, Queryable } from '../../db/pool.js';
import { canManage, type Actor } from '../../lib/actor.js';
import { AppError, ErrorCode, notFound } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/pg-errors.js';
import { quoteBooking, type BundlePurchase } from '../cinemas/booking-quote.js';
import { findCinemaById } from '../cinemas/cinema.repository.js';
import { MAX_GROUP_SIZE } from '../cinemas/cinema.schemas.js';

export const createReservationSchema = z.strictObject({
  cinemaId: z.number({ error: 'Pick a cinema.' }).int().positive(),
  groupSize: z
    .number({ error: 'Group size must be a number.' })
    .int('Group size must be a whole number.')
    .min(1, `Group size must be between 1 and ${MAX_GROUP_SIZE}.`)
    .max(MAX_GROUP_SIZE, `Group size must be between 1 and ${MAX_GROUP_SIZE}.`),
  name: z
    .string({ error: 'Name is required.' })
    .trim()
    .min(1, 'Add a name for the reservation.')
    .max(100, 'Keep the name under 100 characters.'),
});

export const reservationIdParam = z.object({
  id: z.coerce.number().int().positive('Reservation id must be a positive integer.'),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export interface Reservation {
  id: number;
  reference: string;
  name: string;
  cinema: { id: number; name: string };
  groupSize: number;
  totalBundles: number;
  bundles: BundlePurchase[];
  /** The caller may cancel it. */
  canCancel: boolean;
  createdAt: Date;
}

interface Row extends Omit<Reservation, 'cinema' | 'canCancel'> {
  cinemaId: number;
  cinemaName: string;
  createdBy: string | null;
}

const SELECT = `
  SELECT r.id, r.reference, r.name, r.group_size AS "groupSize",
         r.total_bundles AS "totalBundles", r.bundles, r.created_by AS "createdBy",
         r.created_at AS "createdAt", c.id AS "cinemaId", c.name AS "cinemaName"
    FROM reservations r
    JOIN cinemas c ON c.id = r.cinema_id
`;

/** Unambiguous characters only (no 0/O, 1/I/L), so references are easy to read out. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const newReference = () =>
  `DC-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')}`;

function present(row: Row, actor: Actor): Reservation {
  return {
    id: row.id,
    reference: row.reference,
    name: row.name,
    cinema: { id: row.cinemaId, name: row.cinemaName },
    groupSize: row.groupSize,
    totalBundles: row.totalBundles,
    bundles: row.bundles,
    canCancel: canManage(actor, row.createdBy),
    createdAt: row.createdAt,
  };
}

async function findRow(db: Queryable, id: number): Promise<Row | undefined> {
  const { rows } = await db.query<Row>(`${SELECT} WHERE r.id = $1`, [id]);
  return rows[0];
}

/**
 * Reserves the bundles for an opening-night watch party. The quote is
 * recomputed on the server (the same algorithm as GET /cinemas/:id/booking),
 * so a client can never reserve a combination that does not add up.
 * Cinemas in this app have no seat inventory, so any possible quote can be
 * reserved.
 */
export function createReservationService(db: Db) {
  return {
    async create(input: CreateReservationInput, actor: Actor): Promise<Reservation> {
      const cinema = await findCinemaById(db, input.cinemaId);
      if (!cinema) throw notFound('Cinema', input.cinemaId);

      const quote = quoteBooking(cinema.bundleSizes, input.groupSize);
      if (!quote.possible) {
        throw new AppError(
          422,
          ErrorCode.BOOKING_NOT_POSSIBLE,
          `${cinema.name} cannot seat exactly ${input.groupSize} with its bundles of ${cinema.bundleSizes.join(', ')} seats.`,
        );
      }

      for (let attempt = 0; ; attempt += 1) {
        try {
          const { rows } = await db.query<{ id: number }>(
            `INSERT INTO reservations
               (reference, cinema_id, name, group_size, total_bundles, bundles, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              newReference(),
              cinema.id,
              input.name,
              input.groupSize,
              quote.totalBundles,
              JSON.stringify(quote.bundles),
              actor.guestId ?? null,
            ],
          );
          return present((await findRow(db, rows[0]!.id))!, actor);
        } catch (error) {
          // A reference collision is astronomically unlikely; just draw again.
          if (isUniqueViolation(error) && attempt < 3) continue;
          throw error;
        }
      }
    },

    /** A guest sees their own reservations; API callers without a guest id see all. */
    async list(actor: Actor): Promise<Reservation[]> {
      const { rows } = actor.guestId
        ? await db.query<Row>(`${SELECT} WHERE r.created_by = $1 ORDER BY r.created_at DESC`, [
            actor.guestId,
          ])
        : await db.query<Row>(`${SELECT} ORDER BY r.created_at DESC`);
      return rows.map((row) => present(row, actor));
    },

    async cancel(id: number, actor: Actor): Promise<void> {
      const row = await findRow(db, id);
      if (!row) throw notFound('Reservation', id);
      if (!canManage(actor, row.createdBy)) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Only the guest who made it can cancel it.');
      }
      await db.query('DELETE FROM reservations WHERE id = $1', [id]);
    },
  };
}

export type ReservationService = ReturnType<typeof createReservationService>;
