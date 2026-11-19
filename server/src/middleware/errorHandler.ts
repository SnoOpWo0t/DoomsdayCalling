import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../lib/errors.js';

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorBody = {
    error: { code: ErrorCode.NOT_FOUND, message: `No route for ${req.method} ${req.path}.` },
  };
  res.status(404).json(body);
};

/**
 * Single place where errors become HTTP responses. Known errors keep their
 * status and code; anything unexpected is logged and hidden behind a 500 so
 * internals never leak to the client.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.status).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'The request is invalid.',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
    res.status(400).json(body);
    return;
  }

  // Malformed JSON bodies are rejected by express.json() with a SyntaxError.
  if (err instanceof SyntaxError && 'body' in err) {
    const body: ErrorBody = {
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Request body is not valid JSON.' },
    };
    res.status(400).json(body);
    return;
  }

  console.error(err);
  const body: ErrorBody = {
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Something went wrong on our side.' },
  };
  res.status(500).json(body);
};
