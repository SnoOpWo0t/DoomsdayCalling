const STORAGE_KEY = 'doomsday-calling.guest-id';

let cached: string | undefined;

/**
 * Anonymous id for this browser (guest mode). Titles added with it can be
 * edited and deleted from this browser only. Created on first use and kept
 * in localStorage; falls back to an in-memory id if storage is unavailable.
 */
export function getGuestId(): string {
  if (cached) return cached;
  try {
    cached = localStorage.getItem(STORAGE_KEY) ?? undefined;
    if (!cached) {
      cached = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, cached);
    }
  } catch {
    cached = crypto.randomUUID();
  }
  return cached;
}
