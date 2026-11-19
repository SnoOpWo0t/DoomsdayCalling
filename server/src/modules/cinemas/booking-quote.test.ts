import { describe, expect, it } from 'vitest';
import { quoteBooking, type BookingQuote } from './booking-quote.js';

const seatsIn = (quote: BookingQuote) =>
  quote.bundles.reduce((sum, bundle) => sum + bundle.size * bundle.count, 0);

describe('quoteBooking', () => {
  describe('examples from the brief', () => {
    it('sizes 1, 3, 4 and group 6 -> 2 bundles: 3 x 2', () => {
      expect(quoteBooking([1, 3, 4], 6)).toEqual({
        possible: true,
        totalBundles: 2,
        bundles: [{ size: 3, count: 2 }],
      });
    });

    it('sizes 2, 5 and group 11 -> 4 bundles: 5 x 1, 2 x 3', () => {
      expect(quoteBooking([2, 5], 11)).toEqual({
        possible: true,
        totalBundles: 4,
        bundles: [
          { size: 5, count: 1 },
          { size: 2, count: 3 },
        ],
      });
    });

    it('sizes 6, 9, 20 and group 44 -> 4 bundles: 20 x 1, 9 x 2, 6 x 1', () => {
      expect(quoteBooking([6, 9, 20], 44)).toEqual({
        possible: true,
        totalBundles: 4,
        bundles: [
          { size: 20, count: 1 },
          { size: 9, count: 2 },
          { size: 6, count: 1 },
        ],
      });
    });

    it('sizes 4, 6 and group 7 -> not possible', () => {
      expect(quoteBooking([4, 6], 7)).toEqual({ possible: false, totalBundles: null, bundles: [] });
    });
  });

  it('beats the greedy "largest first" strategy', () => {
    // Greedy would take 4 + 1 + 1 = 3 bundles.
    expect(quoteBooking([1, 3, 4], 6).totalBundles).toBe(2);
  });

  it('does not depend on the order of the bundle sizes', () => {
    expect(quoteBooking([20, 6, 9], 44)).toEqual(quoteBooking([6, 9, 20], 44));
  });

  it('ignores duplicate bundle sizes', () => {
    expect(quoteBooking([5, 5, 2], 11)).toEqual(quoteBooking([2, 5], 11));
  });

  it('prefers larger bundles when several answers use the fewest bundles', () => {
    // 4 seats with 1, 2, 3: both 3 + 1 and 2 + 2 use 2 bundles.
    expect(quoteBooking([1, 2, 3], 4).bundles).toEqual([
      { size: 3, count: 1 },
      { size: 1, count: 1 },
    ]);
  });

  it('handles a single exact bundle', () => {
    expect(quoteBooking([500], 500)).toEqual({
      possible: true,
      totalBundles: 1,
      bundles: [{ size: 500, count: 1 }],
    });
  });

  it('handles a group smaller than every bundle', () => {
    expect(quoteBooking([5, 10], 3).possible).toBe(false);
  });

  it('handles the largest allowed input quickly', () => {
    const started = performance.now();
    const quote = quoteBooking([7, 13, 29, 101, 233, 307, 401, 457, 499, 500], 10_000);
    expect(performance.now() - started).toBeLessThan(200);
    expect(quote.possible).toBe(true);
    expect(seatsIn(quote)).toBe(10_000);
  });

  it('rejects invalid input', () => {
    expect(() => quoteBooking([0, 2], 4)).toThrow(RangeError);
    expect(() => quoteBooking([2], 2.5)).toThrow(RangeError);
  });

  it('agrees with a brute-force search on random small inputs', () => {
    /** Breadth-first search over seat totals: the first time we hit `target` uses the fewest bundles. */
    const bruteForceMinimum = (sizes: number[], target: number): number | null => {
      let frontier = new Set([0]);
      const seen = new Set([0]);
      for (let bundles = 0; frontier.size > 0; bundles += 1) {
        if (frontier.has(target)) return bundles;
        const next = new Set<number>();
        for (const total of frontier) {
          for (const size of sizes) {
            const sum = total + size;
            if (sum <= target && !seen.has(sum)) {
              seen.add(sum);
              next.add(sum);
            }
          }
        }
        frontier = next;
      }
      return null;
    };

    let seed = 42;
    const random = (max: number) => 1 + ((seed = (seed * 16807) % 2147483647) % max);

    for (let trial = 0; trial < 500; trial += 1) {
      const sizes = Array.from({ length: random(4) }, () => random(15));
      const group = random(60);
      const quote = quoteBooking(sizes, group);
      const expected = bruteForceMinimum(sizes, group);

      expect(quote.totalBundles).toBe(expected);
      if (quote.possible) {
        expect(seatsIn(quote)).toBe(group);
        expect(quote.bundles.every((bundle) => sizes.includes(bundle.size))).toBe(true);
        expect(quote.bundles.reduce((sum, bundle) => sum + bundle.count, 0)).toBe(
          quote.totalBundles,
        );
      }
    }
  });
});
