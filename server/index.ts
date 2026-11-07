import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createApp } from './app';
import { config } from './config';
import { openDatabase } from './db';
import { renderHtml } from './seo';

const root = process.cwd();
const db = openDatabase(config.dbPath);
const { app, schema } = createApp(db, config);

// Version-controlled data model: additively apply schema/app-schema.json on boot (see prompt.md).
const schemaFile = path.join(root, 'schema/app-schema.json');
if (fs.existsSync(schemaFile)) {
  const doc = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
  if (doc.tables?.length) {
    const r = schema.importSchema(doc);
    if (r.createdTables.length || r.addedFields.length) console.log('[schema] applied app-schema.json', r);
  }
}

if (config.isProd) {
  const clientDir = path.join(root, 'dist/client');
  const template = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf8');
  // Hashed build assets can be cached forever; everything else briefly.
  app.use('/assets', express.static(path.join(clientDir, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    res.type('html').send(renderHtml(template, req.path, config.appUrl));
  });
} else {
  // Dev: Vite runs in-process as middleware so SEO injection and the API share one origin/port.
  const { createServer } = await import('vite');
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || !req.accepts('html')) return next();
    try {
      const raw = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
      const template = await vite.transformIndexHtml(req.originalUrl, raw);
      res.type('html').send(renderHtml(template, req.path, config.appUrl));
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

app.listen(config.port, () => {
  console.log(`\n  ➜  App running at ${config.appUrl}  (${config.env})\n`);
});
