import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './migrations';

export type DB = Database.Database;

export function openDatabase(file: string): DB {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}

/** Applies code-defined system migrations once each, in order. */
export function migrate(db: DB): void {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`);
  const applied = new Set(db.prepare('SELECT id FROM _migrations').pluck().all() as string[]);
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    db.transaction(() => {
      m.up(db);
      db.prepare('INSERT INTO _migrations (id) VALUES (?)').run(m.id);
    })();
  }
}

export const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%fZ','now')`;
export const nowIso = () => new Date().toISOString();
