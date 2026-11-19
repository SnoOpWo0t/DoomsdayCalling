import type { ApiErrorBody, CycleStep } from './types';

/** Error thrown for any non-2xx response, carrying the API's machine-readable code. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The offending path when the server rejected a change with 409 CIRCULAR_DEPENDENCY. */
  get cycle(): CycleStep[] | undefined {
    if (this.code !== 'CIRCULAR_DEPENDENCY') return undefined;
    const details = this.details as { cycle?: CycleStep[] } | undefined;
    return details?.cycle;
  }

  /** Per-field validation messages, keyed by field path. */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return {};
    const errors: Record<string, string> = {};
    for (const issue of this.details as Array<{ path: string; message: string }>) {
      errors[issue.path] ??= issue.message;
    }
    return errors;
  }
}

const BASE_URL = '/api';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the API running?');
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = (body as ApiErrorBody | undefined)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? `Request failed with status ${response.status}.`,
      error?.details,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, data: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    apiRequest<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (path: string) => apiRequest<void>(path, { method: 'DELETE' }),
};
