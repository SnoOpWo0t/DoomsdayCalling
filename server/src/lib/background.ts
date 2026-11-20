import { waitUntil } from '@vercel/functions';

/**
 * Runs `task` without making the caller wait. On Vercel, the function is
 * kept alive until the task settles (serverless functions are otherwise
 * frozen as soon as the response is sent); elsewhere it simply runs.
 */
export function runInBackground(task: Promise<unknown>): void {
  waitUntil(task.catch(() => undefined));
}
