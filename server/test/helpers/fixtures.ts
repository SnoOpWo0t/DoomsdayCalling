import type { Express } from 'express';
import request from 'supertest';
import { expect } from 'vitest';
import { SAMPLE_MOVIES } from '../../src/db/sample-data.js';

/** Creates the brief's sample movies through the API and returns title -> id. */
export async function seedSampleMovies(app: Express): Promise<Record<string, number>> {
  const ids: Record<string, number> = {};
  for (const sample of SAMPLE_MOVIES) {
    const res = await request(app)
      .post('/api/movies')
      .send({
        title: sample.title,
        releaseYear: sample.releaseYear,
        runtimeMinutes: sample.runtimeMinutes,
        prerequisiteIds: sample.prerequisites.map((title) => ids[title]),
      });
    expect(res.status).toBe(201);
    ids[sample.title] = res.body.id;
  }
  return ids;
}
