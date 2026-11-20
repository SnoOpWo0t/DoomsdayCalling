/**
 * Machine-readable error codes returned in every error response body.
 * Clients branch on `code`; `message` is for humans.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  DUPLICATE_TITLE: 'DUPLICATE_TITLE',
  DUPLICATE_NAME: 'DUPLICATE_NAME',
  UNKNOWN_PREREQUISITE: 'UNKNOWN_PREREQUISITE',
  CIRCULAR_DEPENDENCY: 'CIRCULAR_DEPENDENCY',
  EXTERNAL_SERVICE_UNAVAILABLE: 'EXTERNAL_SERVICE_UNAVAILABLE',
  TMDB_NOT_CONFIGURED: 'TMDB_NOT_CONFIGURED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AppError';
  }
}

export const notFound = (resource: string, id: number | string) =>
  new AppError(404, ErrorCode.NOT_FOUND, `${resource} ${id} was not found.`);
