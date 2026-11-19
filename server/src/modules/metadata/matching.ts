/** Hosts we allow images to be loaded from. Anything else is dropped. */
const IMAGE_HOSTS = new Set(['image.tmdb.org', 'static.tvmaze.com', 'upload.wikimedia.org']);

/** Returns `url` if it is an https image on an allowed host, otherwise null. */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && IMAGE_HOSTS.has(parsed.hostname) ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Returns `url` if it is an https link, otherwise null. */
export function safeLinkUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Normalises a title for comparison: lower case, drops a trailing
 * "(2008 film)" / "(TV series)" qualifier and anything that is not a
 * letter or digit. "Iron Man (2008 film)" and "iron man" both become "ironman".
 */
export function normalizeTitle(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
}

export function sameTitle(a: string, b: string): boolean {
  return normalizeTitle(a) === normalizeTitle(b);
}

/** Release years from different sources can differ by one (festival vs. general release). */
export function closeYear(a: number | null | undefined, b: number): boolean {
  return typeof a === 'number' && Math.abs(a - b) <= 1;
}

/** Strips HTML tags and collapses whitespace (TVMaze summaries are HTML). */
export function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0 ? text : null;
}
