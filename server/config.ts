import 'dotenv/config';

const env = process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';
const port = Number(process.env.PORT ?? 3000);

function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable ${name}`);
  return devFallback;
}

export const config = {
  env,
  isProd,
  isTest: env === 'test',
  port,
  /** Bind to loopback in production; the HTTPS reverse proxy is the public entry point. */
  host: process.env.HOST ?? (isProd ? '127.0.0.1' : '0.0.0.0'),
  /** Public origin of the app; used for OAuth callbacks, canonical URLs, sitemap. */
  appUrl: (process.env.APP_URL ?? `http://localhost:${port}`).replace(/\/$/, ''),
  dbPath: process.env.DATABASE_PATH ?? 'data/app.db',
  jwtSecret: required('JWT_SECRET', 'dev-insecure-jwt-secret-change-me'),
  cookieSecret: required('COOKIE_SECRET', 'dev-insecure-cookie-secret-change-me'),
  sessionTtlSeconds: Number(process.env.SESSION_TTL_DAYS ?? 7) * 24 * 60 * 60,
  /** Comma separated. These emails are always admins. If empty, the first user to sign in becomes admin. */
  adminEmails: (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  /** Passwordless "dev login" for local work. Never enable in production. */
  devLogin: !isProd && (process.env.ENABLE_DEV_LOGIN ? process.env.ENABLE_DEV_LOGIN === 'true' : true),
};

export type AppConfig = typeof config;
