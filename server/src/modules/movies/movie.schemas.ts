import { z } from 'zod';

export const MIN_RELEASE_YEAR = 1888; // Roundhay Garden Scene, the oldest surviving film.
export const MAX_RELEASE_YEAR = 2100;

const title = z
  .string({ error: 'Title is required.' })
  .trim()
  .min(1, 'Title cannot be empty.')
  .max(200, 'Title must be 200 characters or fewer.');

const releaseYear = z
  .number({ error: 'Release year must be a number.' })
  .int('Release year must be a whole number.')
  .min(MIN_RELEASE_YEAR, `Release year must be ${MIN_RELEASE_YEAR} or later.`)
  .max(MAX_RELEASE_YEAR, `Release year must be ${MAX_RELEASE_YEAR} or earlier.`);

const runtimeMinutes = z
  .number({ error: 'Runtime must be a number.' })
  .int('Runtime must be a whole number of minutes.')
  .min(1, 'Runtime must be between 1 and 300 minutes.')
  .max(300, 'Runtime must be between 1 and 300 minutes.');

export const MAX_EPISODES = 500;

const kind = z.enum(['movie', 'series'], { error: 'Kind must be "movie" or "series".' });

const episodeCount = z
  .number({ error: 'Episode count must be a number.' })
  .int('Episode count must be a whole number.')
  .min(1, `Episode count must be between 1 and ${MAX_EPISODES}.`)
  .max(MAX_EPISODES, `Episode count must be between 1 and ${MAX_EPISODES}.`);

const MOVIE_EPISODES_MESSAGE = 'A movie has exactly one episode; set kind to "series".';

const watched = z.boolean({ error: 'Watched must be true or false.' });

const tmdbId = z.number().int().positive('TMDb id must be a positive integer.').nullable();

/** Only TMDb-style file paths are accepted, so arbitrary URLs can never be injected. */
const posterPath = z
  .string()
  .regex(/^\/[A-Za-z0-9_-]+\.(jpg|jpeg|png)$/, 'Poster path must look like "/abc123.jpg".')
  .nullable();

/** Duplicate ids are harmless, so they are removed instead of rejected. */
const prerequisiteIds = z
  .array(z.number().int().positive(), { error: 'Prerequisites must be a list of movie ids.' })
  .max(500, 'A movie can have at most 500 prerequisites.')
  .transform((ids) => [...new Set(ids)]);

export const movieIdParam = z.object({
  id: z.coerce.number().int().positive('Movie id must be a positive integer.'),
});

export const createMovieSchema = z
  .strictObject({
    kind: kind.default('movie'),
    title,
    releaseYear,
    runtimeMinutes,
    episodeCount: episodeCount.optional(),
    watched: watched.default(false),
    tmdbId: tmdbId.default(null),
    posterPath: posterPath.default(null),
    prerequisiteIds: prerequisiteIds.default([]),
  })
  .refine((input) => input.kind === 'series' || (input.episodeCount ?? 1) === 1, {
    message: MOVIE_EPISODES_MESSAGE,
    path: ['episodeCount'],
  })
  .transform((input) => ({ ...input, episodeCount: input.episodeCount ?? 1 }));

export const updateMovieSchema = z
  .strictObject({
    kind: kind.optional(),
    title: title.optional(),
    releaseYear: releaseYear.optional(),
    runtimeMinutes: runtimeMinutes.optional(),
    episodeCount: episodeCount.optional(),
    watched: watched.optional(),
    tmdbId: tmdbId.optional(),
    posterPath: posterPath.optional(),
    prerequisiteIds: prerequisiteIds.optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })
  .refine((patch) => patch.kind !== 'movie' || (patch.episodeCount ?? 1) === 1, {
    message: MOVIE_EPISODES_MESSAGE,
    path: ['episodeCount'],
  });

export { MOVIE_EPISODES_MESSAGE };

export type CreateMovieInput = z.infer<typeof createMovieSchema>;
export type UpdateMovieInput = z.infer<typeof updateMovieSchema>;
