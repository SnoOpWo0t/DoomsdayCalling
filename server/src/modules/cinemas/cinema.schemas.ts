import { z } from 'zod';

export const MAX_GROUP_SIZE = 10_000;

export const cinemaIdParam = z.object({
  id: z.coerce.number().int().positive('Cinema id must be a positive integer.'),
});

export const createCinemaSchema = z.strictObject({
  name: z
    .string({ error: 'Name is required.' })
    .trim()
    .min(1, 'Name cannot be empty.')
    .max(200, 'Name must be 200 characters or fewer.'),
  bundleSizes: z
    .array(
      z
        .number({ error: 'Bundle sizes must be numbers.' })
        .int('Bundle sizes must be whole numbers.')
        .min(1, 'Each bundle holds between 1 and 500 seats.')
        .max(500, 'Each bundle holds between 1 and 500 seats.'),
      { error: 'Bundle sizes must be a list of numbers.' },
    )
    // The rule is about *different* sizes, so duplicates are removed before counting.
    .transform((sizes) => [...new Set(sizes)].sort((a, b) => a - b))
    .refine((sizes) => sizes.length >= 1 && sizes.length <= 10, {
      message: 'A cinema needs between 1 and 10 different bundle sizes.',
    }),
});

export const bookingQuerySchema = z.object({
  groupSize: z.coerce
    .number({ error: 'groupSize must be a number.' })
    .int('groupSize must be a whole number.')
    .min(1, `groupSize must be between 1 and ${MAX_GROUP_SIZE}.`)
    .max(MAX_GROUP_SIZE, `groupSize must be between 1 and ${MAX_GROUP_SIZE}.`),
});

export type CreateCinemaInput = z.infer<typeof createCinemaSchema>;
