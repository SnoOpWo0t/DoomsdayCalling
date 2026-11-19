/** Announced US release date of Avengers: Doomsday. Update here if it moves. */
export const PREMIERE_DATE = new Date(2026, 11, 18);

/** Mirrors the API's validation limits so forms can guide users before submitting. */
export const LIMITS = {
  runtime: { min: 1, max: 300 },
  releaseYear: { min: 1888, max: 2100 },
  groupSize: { min: 1, max: 10_000 },
  bundleSize: { min: 1, max: 500 },
  bundleSizesPerCinema: { min: 1, max: 10 },
} as const;
