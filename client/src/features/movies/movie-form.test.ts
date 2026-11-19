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

describe('series', () => {
  const series: MovieFormValues = { ...valid, kind: 'series', episodeCount: '9' };

  it('requires a valid episode count for a series', () => {
    expect(validateMovieForm(series)).toEqual({});
    expect(validateMovieForm({ ...series, episodeCount: '' }).episodeCount).toBeDefined();
    expect(validateMovieForm({ ...series, episodeCount: '501' }).episodeCount).toBeDefined();
  });

  it('ignores the episode field for movies', () => {
    expect(validateMovieForm({ ...valid, episodeCount: 'abc' })).toEqual({});
    expect(toMovieInput({ ...valid, episodeCount: '9' }).episodeCount).toBe(1);
  });

  it('sends the episode count for a series', () => {
    expect(toMovieInput(series)).toMatchObject({ kind: 'series', episodeCount: 9 });
  });
});

describe('toMovieInput', () => {
  it('trims the title and converts numbers', () => {
    expect(toMovieInput({ ...valid, prerequisiteIds: [3, 4] })).toEqual({
      kind: 'movie',
      episodeCount: 1,
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
