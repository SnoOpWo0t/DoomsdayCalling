import { describe, expect, it } from 'vitest';
import { daysUntil, formatRuntime, pluralize, posterUrl } from './format';

describe('formatRuntime', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h 00m'],
    [126, '2h 06m'],
    [1000, '16h 40m'],
  ])('%i minutes -> %s', (minutes, expected) => {
    expect(formatRuntime(minutes)).toBe(expected);
  });
});

describe('pluralize', () => {
  it('uses the singular for one', () => {
    expect(pluralize(1, 'bundle')).toBe('1 bundle');
  });

  it('uses the plural and groups thousands otherwise', () => {
    expect(pluralize(10000, 'seat')).toBe('10,000 seats');
  });
});

describe('posterUrl', () => {
  it('builds a TMDb image URL', () => {
    expect(posterUrl('/abc.jpg', 'w92')).toBe('https://image.tmdb.org/t/p/w92/abc.jpg');
  });

  it('returns null without a poster', () => {
    expect(posterUrl(null)).toBeNull();
  });
});

describe('daysUntil', () => {
  it('counts whole calendar days', () => {
    expect(daysUntil(new Date(2026, 11, 18), new Date(2026, 10, 19, 23, 59))).toBe(29);
  });

  it('never goes negative', () => {
    expect(daysUntil(new Date(2020, 0, 1), new Date(2026, 0, 1))).toBe(0);
  });
});
