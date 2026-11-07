import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import passport from 'passport';
import { dataRouter, schemaRouter, usersRouter } from './api';
import { authRouter } from './auth/routes';
import { attachUser } from './auth/session';
import { config as defaultConfig, type AppConfig } from './config';
import { DataService } from './data/service';
import type { DB } from './db';
import { errorHandler, notFound } from './errors';
import { SchemaService } from './schema/service';
import { seoRouter } from './seo';

/** Builds the Express app (API + SEO endpoints). HTML serving is added in index.ts. */
export function createApp(db: DB, config: AppConfig = defaultConfig): { app: Express; schema: SchemaService; data: DataService } {
  const app = express();
  const schema = new SchemaService(db);
  const data = new DataService(db, schema);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(
    helmet({
      contentSecurityPolicy: config.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser(config.cookieSecret));
  app.use(passport.initialize());
  app.use(attachUser(db, config));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter(db, config));
  app.use('/api/schema', schemaRouter(schema));
  app.use('/api/data', dataRouter(data, schema));
  app.use('/api/users', usersRouter(db));
  app.use('/api', (_req, _res, next) => next(notFound('API route not found')));
  app.use(seoRouter(config.appUrl));
  app.use('/api', errorHandler);

  return { app, schema, data };
}
