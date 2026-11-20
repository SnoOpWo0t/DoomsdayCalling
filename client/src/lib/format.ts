/** Formats minutes as "2h 06m", "45m" or "0m". */
export function formatRuntime(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${String(rest).padStart(2, '0')}m`;
}

/** "1 bundle" / "4 bundles". */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/** Builds a TMDb poster URL at the requested width, or null when there is no poster. */
export function posterUrl(
  posterPath: string | null,
  size: 'w92' | 'w185' | 'w342' | 'w500' = 'w185',
): string | null {
  return posterPath ? `${TMDB_IMAGE_BASE}/${size}${posterPath}` : null;
}

/** Whole days from `from` until `to`, never negative. */
export function daysUntil(to: Date, from: Date = new Date()): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const end = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.round((end - start) / msPerDay));
}

interface Watchable {
  kind: 'movie' | 'series';
  runtimeMinutes: number;
  episodeCount: number;
}

/** Minutes needed to watch a title in full: a movie's runtime, or every episode of a series. */
export function watchTime(title: Pick<Watchable, 'runtimeMinutes' | 'episodeCount'>): number {
  return title.runtimeMinutes * title.episodeCount;
}

/** "2h 06m" for a movie, "9 episodes · 5h 51m" for a series. */
export function describeLength(title: Watchable): string {
  if (title.kind === 'movie') return formatRuntime(title.runtimeMinutes);
  return `${pluralize(title.episodeCount, 'episode')} · ${formatRuntime(watchTime(title))}`;
}

/**
 * Bundles as a plain sentence fragment:
 * [{20,1},{9,2},{6,1}] -> "1 bundle of 20 seats, 2 bundles of 9 seats and 1 bundle of 6 seats".
 */
export function describeBundles(bundles: ReadonlyArray<{ size: number; count: number }>): string {
  const parts = bundles.map(
    ({ size, count }) => `${pluralize(count, 'bundle')} of ${pluralize(size, 'seat')}`,
  );
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
