/**
 * Pure logic for Feature 2: the booking quote. No database, no framework.
 *
 * Problem: given bundle sizes (each can be bought any number of times) and a
 * group size, find the fewest bundles whose seats add up to *exactly* the
 * group size. This is the classic "minimum coin change" problem.
 *
 * Why not greedy? Taking the largest bundle first fails: for sizes 1, 3, 4
 * and a group of 6, greedy picks 4 + 1 + 1 (3 bundles) but 3 + 3 (2 bundles)
 * is optimal. So we use dynamic programming.
 *
 *   best[s] = fewest bundles summing to exactly s seats (Infinity if impossible)
 *   best[0] = 0
 *   best[s] = 1 + min(best[s - b]) over every bundle size b <= s
 *
 * We also record which bundle achieved each optimum (`lastBundle[s]`), then
 * walk back from the group size to recover how many of each size to buy.
 *
 * Complexity: O(groupSize * bundleSizes) time, O(groupSize) memory. With the
 * API limits (10,000 seats, 10 sizes) that is at most 100,000 steps.
 */

export interface BundlePurchase {
  /** Seats per bundle. */
  size: number;
  /** How many bundles of this size to buy. */
  count: number;
}

export type BookingQuote =
  | { possible: true; totalBundles: number; bundles: BundlePurchase[] }
  | { possible: false; totalBundles: null; bundles: [] };

export function quoteBooking(bundleSizes: readonly number[], groupSize: number): BookingQuote {
  if (!Number.isInteger(groupSize) || groupSize < 0) {
    throw new RangeError('groupSize must be a non-negative integer');
  }
  if (bundleSizes.some((size) => !Number.isInteger(size) || size < 1)) {
    throw new RangeError('bundle sizes must be positive integers');
  }

  // Larger sizes first + strict "<" below: when several combinations use the
  // same number of bundles, the one with larger bundles wins. Deterministic.
  const sizes = [...new Set(bundleSizes)].sort((a, b) => b - a);

  const best = new Array<number>(groupSize + 1).fill(Infinity);
  const lastBundle = new Array<number>(groupSize + 1).fill(0);
  best[0] = 0;

  for (let seats = 1; seats <= groupSize; seats += 1) {
    for (const size of sizes) {
      if (size > seats) continue;
      const candidate = best[seats - size]! + 1;
      if (candidate < best[seats]!) {
        best[seats] = candidate;
        lastBundle[seats] = size;
      }
    }
  }

  if (best[groupSize] === Infinity) {
    return { possible: false, totalBundles: null, bundles: [] };
  }

  // Walk back from the group size, one bundle at a time.
  const counts = new Map<number, number>();
  for (let remaining = groupSize; remaining > 0; remaining -= lastBundle[remaining]!) {
    const size = lastBundle[remaining]!;
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  const bundles = [...counts.entries()]
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => b.size - a.size);

  return { possible: true, totalBundles: best[groupSize]!, bundles };
}
