import { Router } from 'express';
import { z } from 'zod';
import type { DB } from './db';
import { requireAuth } from './auth/session';
import { newsSources } from './news';

const knownSourceIds = new Set(newsSources.map((source) => source.id));
const favoritesInput = z.object({
  favoriteSourceIds: z.array(z.string().min(1).max(64)).max(newsSources.length).superRefine((ids, ctx) => {
    if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Favorite source IDs must be unique' });
    for (const id of ids) {
      if (!knownSourceIds.has(id)) ctx.addIssue({ code: 'custom', message: `Unknown source ID: ${id}` });
    }
  }),
});

/** Private account preferences; raw access is not exposed through the generic data API. */
export function newsPreferencesRouter(db: DB): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/favorites', (req, res) => {
    const row = db
      .prepare('SELECT favorite_source_ids FROM news_preferences WHERE user_id = ? AND created_by = ?')
      .get(req.user!.id, req.user!.id) as { favorite_source_ids: string } | undefined;
    let favoriteSourceIds: string[] = [];
    if (row) {
      try {
        const parsed: unknown = JSON.parse(row.favorite_source_ids);
        if (Array.isArray(parsed)) favoriteSourceIds = parsed.filter((id): id is string => typeof id === 'string' && knownSourceIds.has(id));
      } catch {
        // A malformed preference value should not prevent access to the reader.
      }
    }
    res.json({ favoriteSourceIds });
  });

  router.put('/favorites', (req, res) => {
    const { favoriteSourceIds } = favoritesInput.parse(req.body);
    const serialized = JSON.stringify(favoriteSourceIds);
    db.prepare(
      `INSERT INTO news_preferences (created_by, user_id, favorite_source_ids)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id) DO UPDATE SET
         favorite_source_ids = excluded.favorite_source_ids,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    ).run(req.user!.id, req.user!.id, serialized);
    res.json({ favoriteSourceIds });
  });

  return router;
}