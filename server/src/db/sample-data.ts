/**
 * Sample data from the assessment brief ("These links are sample data for
 * this challenge, not an official watch guide"). Runtimes are theatrical
 * runtimes; Avengers: Doomsday is unreleased, so its runtime is an estimate.
 *
 * Prerequisites reference other entries by title and must appear earlier in
 * the list, so the data can be inserted in a single pass.
 */
export interface SampleMovie {
  title: string;
  releaseYear: number;
  runtimeMinutes: number;
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
