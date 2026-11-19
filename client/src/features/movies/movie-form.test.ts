import { describe, expect, it } from 'vitest';
import { initialValues, toMovieInput, validateMovieForm, type MovieFormValues } from './movie-form';

const valid: MovieFormValues = {
  ...initialValues(),
  title: '  Iron Man ',
  releaseYear: '2008',
  runtimeMinutes: '126',
};

describe('validateMovieForm', () => {
  it('accepts a complete movie', () => {
    expect(validateMovieForm(valid)).toEqual({});
  });

  it('requires a title', () => {
    expect(validateMovieForm({ ...valid, title: '   ' }).title).toBeDefined();
  });

  it.each(['0', '301', '12.5', 'abc', ''])('rejects runtime %j', (runtimeMinutes) => {
    expect(validateMovieForm({ ...valid, runtimeMinutes }).runtimeMinutes).toBeDefined();
  });

  it.each(['1', '300'])('accepts boundary runtime %s', (runtimeMinutes) => {
    expect(validateMovieForm({ ...valid, runtimeMinutes }).runtimeMinutes).toBeUndefined();
  });

  it.each(['1887', '2101', '20x8'])('rejects release year %j', (releaseYear) => {
    expect(validateMovieForm({ ...valid, releaseYear }).releaseYear).toBeDefined();
  });
});

describe('toMovieInput', () => {
  it('trims the title and converts numbers', () => {
    expect(toMovieInput({ ...valid, prerequisiteIds: [3, 4] })).toEqual({
      title: 'Iron Man',
      releaseYear: 2008,
      runtimeMinutes: 126,
      watched: false,
      prerequisiteIds: [3, 4],
      tmdbId: null,
      posterPath: null,
    });
  });
});
