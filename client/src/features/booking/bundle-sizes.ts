import { LIMITS } from '../../lib/constants';

export interface ParsedBundleSizes {
  sizes: number[];
  error?: string;
}

/**
 * Parses free text like "2, 5" or "6 9 20" into sorted, distinct bundle
 * sizes and checks them against the API's limits.
 */
export function parseBundleSizes(text: string): ParsedBundleSizes {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  const { bundleSize, bundleSizesPerCinema } = LIMITS;

  const invalid = tokens.find((token) => !/^\d+$/.test(token));
  if (invalid) return { sizes: [], error: `"${invalid}" is not a whole number of seats.` };

  const sizes = [...new Set(tokens.map(Number))].sort((a, b) => a - b);

  if (sizes.length < bundleSizesPerCinema.min) {
    return { sizes, error: 'Add at least one bundle size.' };
  }
  if (sizes.length > bundleSizesPerCinema.max) {
    return {
      sizes,
      error: `A cinema can sell at most ${bundleSizesPerCinema.max} different sizes.`,
    };
  }
  const outOfRange = sizes.find((size) => size < bundleSize.min || size > bundleSize.max);
  if (outOfRange !== undefined) {
    return {
      sizes,
      error: `Bundles hold ${bundleSize.min}-${bundleSize.max} seats (${outOfRange} is out of range).`,
    };
  }
  return { sizes };
}

/** Parses the group size field; returns undefined when it is not a valid group. */
export function parseGroupSize(text: string): number | undefined {
  if (!/^\d+$/.test(text.trim())) return undefined;
  const value = Number(text);
  const { min, max } = LIMITS.groupSize;
  return value >= min && value <= max ? value : undefined;
}
