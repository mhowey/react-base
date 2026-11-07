import crypto from 'node:crypto';
import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import type { AuthProviderInfo } from '../../shared/schema-types';
import type { AppConfig } from '../config';
import type { DB } from '../db';
import { notFound } from '../errors';
import { listIdentities, upsertExternalUser } from '../users/repo';
import { enabledProviders } from './providers';
import { clearSessionCookie, setSessionCookie } from './session';

const STATE_COOKIE = 'oauth_state';

/** Only allow same-origin relative redirects. */
const safeReturnTo = (v: unknown) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? v : '/dashboard');

export function authRouter(db: DB, config: AppConfig): Router {
  const router = Router();
  const providers = enabledProviders();

  for (const p of providers) {
    passport.use(
      p.id,
      p.create(
        {
          clientID: process.env[`${p.envPrefix}_CLIENT_ID`]!,
          clientSecret: process.env[`${p.envPrefix}_CLIENT_SECRET`]!,
          callbackURL: `${config.appUrl}/api/auth/${p.id}/callback`,
        },
        (profile) => upsertExternalUser(db, profile, config.adminEmails),
      ),
    );
  }

  router.get('/providers', (_req, res) => {
    const list: AuthProviderInfo[] = providers.map((p) => ({ id: p.id, name: p.name, loginUrl: `/api/auth/${p.id}` }));
    res.json({ providers: list, devLogin: config.devLogin });
  });

  router.get('/me', (req, res) => {
    res.json({ user: req.user ?? null, identities: req.user ? listIdentities(db, req.user.id) : [] });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  if (config.devLogin) {
    const body = z.object({ email: z.email(), name: z.string().min(1).max(100).optional() });
    router.post('/dev-login', (req, res) => {
      const { email, name } = body.parse(req.body);
      const user = upsertExternalUser(
        db,
        { provider: 'dev', providerUserId: email.toLowerCase(), email, name: name ?? email.split('@')[0] },
        config.adminEmails,
      );
      setSessionCookie(res, user, config);
      res.json({ user });
    });
  }

  // Step 1: redirect to provider. CSRF state is kept in a signed, short-lived cookie (no server session needed).
  router.get('/:provider', (req, res, next) => {
    const p = providers.find((x) => x.id === req.params.provider);
    if (!p) return next(notFound('Unknown or disabled auth provider'));
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, JSON.stringify({ state, returnTo: safeReturnTo(req.query.returnTo) }), {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: config.isProd,
      maxAge: 10 * 60 * 1000,
      path: '/api/auth',
    });
    passport.authenticate(p.id, { session: false, scope: p.scope, state })(req, res, next);
  });

  // Step 2: provider redirects back here.
  router.get('/:provider/callback', (req, res, next) => {
    const p = providers.find((x) => x.id === req.params.provider);
    if (!p) return next(notFound('Unknown or disabled auth provider'));
    let saved: { state?: string; returnTo?: string } = {};
    try {
      saved = JSON.parse(req.signedCookies?.[STATE_COOKIE] ?? '{}');
    } catch {
      /* ignore */
    }
    res.clearCookie(STATE_COOKIE, { path: '/api/auth' });
    if (!saved.state || saved.state !== req.query.state) {
      return res.redirect('/login?error=invalid_state');
    }
    passport.authenticate(p.id, { session: false }, (err: unknown, user: Express.User | false) => {
      if (err || !user) {
        if (err) console.error(`[auth:${p.id}]`, err);
        return res.redirect(`/login?error=${encodeURIComponent(err ? 'provider_error' : 'access_denied')}`);
      }
      setSessionCookie(res, user, config);
      res.redirect(safeReturnTo(saved.returnTo));
    })(req, res, next);
  });

  return router;
}
