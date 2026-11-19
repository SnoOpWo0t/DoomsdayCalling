/** PostgreSQL SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = '23505';

interface PgError {
  code?: string;
  constraint?: string;
}

/** True when `error` is a unique-constraint violation, optionally on a specific constraint/index. */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const pgError = error as PgError;
  return (
    pgError.code === UNIQUE_VIOLATION &&
    (constraint === undefined || pgError.constraint === constraint)
  );
}
