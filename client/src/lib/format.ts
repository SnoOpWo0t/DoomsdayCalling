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
  size: 'w92' | 'w185' | 'w342' = 'w185',
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
