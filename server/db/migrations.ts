import type Database from 'better-sqlite3';

/**
 * System migrations (users, auth, schema-builder metadata).
 * Append new entries — never edit one that has shipped.
 * Application tables are normally created through the Data Builder instead,
 * and can be checked in via `GET /api/schema/export` + `POST /api/schema/import`.
 */
export const migrations: { id: string; up: (db: Database.Database) => void }[] = [
  {
    id: '001_users_and_auth',
    up: (db) =>
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE COLLATE NOCASE,
          name TEXT,
          avatar_url TEXT,
          role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          last_login_at TEXT
        );
        CREATE TABLE user_identities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          email TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          UNIQUE (provider, provider_user_id)
        );
        CREATE INDEX ix_user_identities_user ON user_identities(user_id);
      `),
  },
  {
    id: '002_schema_builder',
    up: (db) =>
      db.exec(`
        CREATE TABLE _tables (
          name TEXT PRIMARY KEY,
          label TEXT NOT NULL,
          description TEXT,
          read_access TEXT NOT NULL DEFAULT 'authenticated' CHECK (read_access IN ('public','authenticated','admin')),
          write_access TEXT NOT NULL DEFAULT 'admin' CHECK (write_access IN ('authenticated','owner','admin')),
          display_field TEXT,
          created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
          updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );
        CREATE TABLE _fields (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL REFERENCES _tables(name) ON DELETE CASCADE ON UPDATE CASCADE,
          name TEXT NOT NULL,
          label TEXT NOT NULL,
          type TEXT NOT NULL,
          required INTEGER NOT NULL DEFAULT 0,
          is_unique INTEGER NOT NULL DEFAULT 0,
          default_value TEXT,
          options TEXT NOT NULL DEFAULT '{}',
          description TEXT,
          position INTEGER NOT NULL DEFAULT 0,
          UNIQUE (table_name, name)
        );
      `),
  },
];
