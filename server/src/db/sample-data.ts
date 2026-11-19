/**
 * Sample data from the assessment brief ("These links are sample data for
 * this challenge, not an official watch guide"). Runtimes are theatrical
 * runtimes; Avengers: Doomsday is unreleased, so its runtime is an estimate.
 *
 * Prerequisites reference other entries by title and must appear earlier in
 * the list, so the data can be inserted in a single pass.
 */
export interface SampleMovie {
  kind?: 'movie' | 'series';
  title: string;
  releaseYear: number;
  /** Movie runtime, or typical episode length for a series. */
  runtimeMinutes: number;
  episodeCount?: number;
  prerequisites: string[];
}

export const SAMPLE_MOVIES: readonly SampleMovie[] = [
  { title: 'Iron Man', releaseYear: 2008, runtimeMinutes: 126, prerequisites: [] },
  {
    title: 'Captain America: The First Avenger',
    releaseYear: 2011,
    runtimeMinutes: 124,
    prerequisites: [],
  },
  {
    title: 'The Avengers',
    releaseYear: 2012,
    runtimeMinutes: 143,
    prerequisites: ['Iron Man', 'Captain America: The First Avenger'],
  },
  {
    title: 'Captain America: Civil War',
    releaseYear: 2016,
    runtimeMinutes: 147,
    prerequisites: ['The Avengers'],
  },
  { title: 'Thor: Ragnarok', releaseYear: 2017, runtimeMinutes: 130, prerequisites: [] },
  {
    title: 'Avengers: Infinity War',
    releaseYear: 2018,
    runtimeMinutes: 149,
    prerequisites: ['Captain America: Civil War', 'Thor: Ragnarok'],
  },
  {
    title: 'Avengers: Endgame',
    releaseYear: 2019,
    runtimeMinutes: 181,
    prerequisites: ['Avengers: Infinity War'],
  },
  {
    title: 'Avengers: Doomsday',
    releaseYear: 2026,
    runtimeMinutes: 150,
    prerequisites: ['Avengers: Endgame'],
  },
];

/**
 * Extra titles that show series and movies depending on each other. They all
 * come *after* Avengers: Endgame, so the brief's expected rewatch results
 * (e.g. 7 titles before Avengers: Doomsday) are unchanged.
 */
export const EXTRA_SAMPLE_TITLES: readonly SampleMovie[] = [
  {
    kind: 'series',
    title: 'WandaVision',
    releaseYear: 2021,
    runtimeMinutes: 39,
    episodeCount: 9,
    prerequisites: ['Avengers: Endgame'],
  },
  {
    kind: 'series',
    title: 'Loki',
    releaseYear: 2021,
    runtimeMinutes: 51,
    episodeCount: 6,
    prerequisites: ['Avengers: Endgame'],
  },
  {
    title: 'Doctor Strange in the Multiverse of Madness',
    releaseYear: 2022,
    runtimeMinutes: 126,
    prerequisites: ['WandaVision'],
  },
];

/** Fictional cinemas whose bundle sizes match the brief's booking examples. */
export const SAMPLE_CINEMAS: ReadonlyArray<{ name: string; bundleSizes: number[] }> = [
  { name: 'Aurora Screens', bundleSizes: [1, 3, 4] },
  { name: 'Lantern Picture Palace', bundleSizes: [2, 5] },
  { name: 'Meridian Grand', bundleSizes: [6, 9, 20] },
  { name: 'Velvet Row Cinema', bundleSizes: [4, 6] },
];
