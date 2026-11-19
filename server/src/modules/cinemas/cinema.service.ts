import { withTransaction, type Db } from '../../db/pool.js';
import { AppError, ErrorCode, notFound } from '../../lib/errors.js';
import { isUniqueViolation } from '../../lib/pg-errors.js';
import { quoteBooking } from './booking-quote.js';
import * as repo from './cinema.repository.js';
import type { CreateCinemaInput } from './cinema.schemas.js';
import type { BookingQuoteResponse, Cinema } from './cinema.types.js';

export function createCinemaService(db: Db) {
  return {
    list(): Promise<Cinema[]> {
      return repo.listCinemas(db);
    },

    async get(id: number): Promise<Cinema> {
      const cinema = await repo.findCinemaById(db, id);
      if (!cinema) throw notFound('Cinema', id);
      return cinema;
    },

    async create(input: CreateCinemaInput): Promise<Cinema> {
      return withTransaction(db, async (tx) => {
        try {
          const id = await repo.insertCinema(tx, input.name, input.bundleSizes);
          return (await repo.findCinemaById(tx, id))!;
        } catch (error) {
          if (isUniqueViolation(error, repo.NAME_UNIQUE_INDEX)) {
            throw new AppError(
              409,
              ErrorCode.DUPLICATE_NAME,
              `A cinema named "${input.name}" already exists.`,
            );
          }
          throw error;
        }
      });
    },

    async remove(id: number): Promise<void> {
      if (!(await repo.deleteCinema(db, id))) throw notFound('Cinema', id);
    },

    async quote(id: number, groupSize: number): Promise<BookingQuoteResponse> {
      const cinema = await repo.findCinemaById(db, id);
      if (!cinema) throw notFound('Cinema', id);

      const quote = quoteBooking(cinema.bundleSizes, groupSize);
      return {
        cinema: { id: cinema.id, name: cinema.name, bundleSizes: cinema.bundleSizes },
        groupSize,
        ...quote,
      };
    },
  };
}

export type CinemaService = ReturnType<typeof createCinemaService>;
