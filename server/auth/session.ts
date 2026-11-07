import type { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AppUser } from '../../shared/schema-types';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { forbidden, unauthorized } from '../errors';
import { getUserById } from '../users/repo';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Passport types req.user as Express.User — make it our AppUser.
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AppUser {}
  }
}

export const SESSION_COOKIE = 'app_session';

export function setSessionCookie(res: Response, user: AppUser, config: AppConfig) {
  const token = jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: config.sessionTtlSeconds });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionTtlSeconds * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Resolves the session cookie into req.user (fresh from the DB so role changes apply immediately). */
export function attachUser(db: DB, config: AppConfig): RequestHandler {
  return (req, _res, next) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
        const user = getUserById(db, Number(payload.sub));
        if (user) req.user = user;
      } catch {
        /* invalid / expired token → anonymous */
      }
    }
    next();
  };
}

export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) =>
  req.user ? next() : next(unauthorized());

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden('Admin access required'));
  next();
};
