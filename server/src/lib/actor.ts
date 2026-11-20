import type { Request } from 'express';
import { z } from 'zod';
import { AppError, ErrorCode } from './errors.js';

/**
 * Who is making a request. In guest mode the browser sends an anonymous id in
 * the `X-Guest-Id` header. Requests without it (API clients, the brief's
 * examples) act with full access, so the assessment API behaves as specified.
 */
export interface Actor {
  guestId: string | undefined;
}

const guestId = z.uuid();

export function actorFrom(req: Request): Actor {
  const header = req.get('x-guest-id');
  if (header === undefined || header === '') return { guestId: undefined };
  const parsed = guestId.safeParse(header);
  if (!parsed.success) {
    throw new AppError(400, ErrorCode.VALIDATION_ERROR, 'X-Guest-Id must be a UUID.');
  }
  return { guestId: parsed.data.toLowerCase() };
}

/** True when the actor may change a title's details or delete it. */
export function canManage(actor: Actor, createdBy: string | null): boolean {
  return actor.guestId === undefined || actor.guestId === createdBy;
}
