import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new HttpError(400, msg, details);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, msg);
export const unauthorized = (msg = 'Authentication required') => new HttpError(401, msg);
export const conflict = (msg: string) => new HttpError(409, msg);

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }
  const code = (err as { code?: string }).code;
  if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
    res.status(409).json({ error: 'A record with that value already exists', details: String(err.message) });
    return;
  }
  if (code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    res.status(409).json({ error: 'Related record does not exist or is still referenced' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
