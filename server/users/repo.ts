import type { AppUser } from '../../shared/schema-types';
import { nowIso, type DB } from '../db';

interface UserRow {
  id: number;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  last_login_at: string | null;
}

const toUser = (r: UserRow): AppUser => ({
  id: r.id,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  role: r.role,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

export interface ExternalProfile {
  provider: string;
  providerUserId: string;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

export function getUserById(db: DB, id: number): AppUser | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  return row ? toUser(row) : null;
}

export function listUsers(db: DB): (AppUser & { providers: string[] })[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY id').all() as UserRow[];
  const ids = db.prepare('SELECT user_id, provider FROM user_identities').all() as { user_id: number; provider: string }[];
  return rows.map((r) => ({ ...toUser(r), providers: ids.filter((i) => i.user_id === r.id).map((i) => i.provider) }));
}

export function listIdentities(db: DB, userId: number) {
  return db
    .prepare('SELECT provider, email, created_at AS createdAt FROM user_identities WHERE user_id = ? ORDER BY id')
    .all(userId) as { provider: string; email: string | null; createdAt: string }[];
}

export function setUserRole(db: DB, id: number, role: 'user' | 'admin'): AppUser | null {
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  return getUserById(db, id);
}

/**
 * Find-or-create a user for an external identity.
 *  1. Known identity            → that user
 *  2. Unknown identity, email matches an existing user → link identity to them
 *  3. Otherwise                 → create user
 * Role: ADMIN_EMAILS are always admin; if there are no users yet, the first becomes admin.
 */
export function upsertExternalUser(db: DB, p: ExternalProfile, adminEmails: string[]): AppUser {
  return db.transaction(() => {
    const email = p.email?.trim().toLowerCase() || null;
    const identity = db
      .prepare('SELECT user_id FROM user_identities WHERE provider = ? AND provider_user_id = ?')
      .get(p.provider, p.providerUserId) as { user_id: number } | undefined;

    let userId = identity?.user_id;
    if (!userId && email) {
      userId = (db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined)?.id;
    }
    if (!userId) {
      const isFirst = (db.prepare('SELECT COUNT(*) FROM users').pluck().get() as number) === 0;
      const role = isFirst || (email && adminEmails.includes(email)) ? 'admin' : 'user';
      userId = Number(
        db
          .prepare('INSERT INTO users (email, name, avatar_url, role) VALUES (?, ?, ?, ?)')
          .run(email, p.name ?? null, p.avatarUrl ?? null, role).lastInsertRowid,
      );
    }
    if (!identity) {
      db.prepare('INSERT INTO user_identities (user_id, provider, provider_user_id, email) VALUES (?, ?, ?, ?)').run(
        userId,
        p.provider,
        p.providerUserId,
        email,
      );
    }
    db.prepare(
      `UPDATE users SET
         name = COALESCE(name, ?), avatar_url = COALESCE(?, avatar_url), email = COALESCE(email, ?),
         role = CASE WHEN ? THEN 'admin' ELSE role END,
         last_login_at = ?
       WHERE id = ?`,
    ).run(p.name ?? null, p.avatarUrl ?? null, email, email && adminEmails.includes(email) ? 1 : 0, nowIso(), userId);
    return getUserById(db, userId)!;
  })();
}
