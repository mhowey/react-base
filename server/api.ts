import { Router } from 'express';
import { z } from 'zod';
import { FIELD_TYPES } from '../shared/schema-types';
import { requireAdmin } from './auth/session';
import type { DataService } from './data/service';
import { badRequest } from './errors';
import type { SchemaService } from './schema/service';
import type { DB } from './db';
import { listUsers, setUserRole } from './users/repo';

const idParam = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw badRequest('Invalid id');
  return n;
};
const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

/** Schema builder API — admin only. */
export function schemaRouter(schema: SchemaService): Router {
  const r = Router();
  r.use(requireAdmin);

  r.get('/field-types', (_req, res) => res.json(FIELD_TYPES));
  r.get('/tables', (_req, res) => res.json(schema.listTables()));
  r.post('/tables', (req, res) => res.status(201).json(schema.createTable(req.body)));
  r.get('/tables/:table', (req, res) => res.json(schema.requireTable(req.params.table)));
  r.patch('/tables/:table', (req, res) => res.json(schema.updateTable(req.params.table, req.body)));
  r.delete('/tables/:table', (req, res) => {
    schema.dropTable(req.params.table);
    res.status(204).end();
  });
  r.post('/tables/:table/fields', (req, res) => res.status(201).json(schema.addField(req.params.table, req.body)));
  r.put('/tables/:table/field-order', (req, res) =>
    res.json(schema.reorderFields(req.params.table, z.object({ names: z.array(z.string()) }).parse(req.body).names)),
  );
  r.patch('/tables/:table/fields/:field', (req, res) => res.json(schema.updateField(req.params.table, req.params.field, req.body)));
  r.delete('/tables/:table/fields/:field', (req, res) => res.json(schema.removeField(req.params.table, req.params.field)));

  r.get('/export', (_req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="schema.json"');
    res.json(schema.exportSchema());
  });
  r.post('/import', (req, res) => res.json(schema.importSchema(req.body)));
  r.get('/types.ts', (_req, res) => res.type('text/plain').send(schema.generateTypes()));
  return r;
}

/** Generic data API for builder tables — access is governed per table. */
export function dataRouter(data: DataService, schema: SchemaService): Router {
  const r = Router();

  /** Tables the current user can read (used by app UIs to discover the schema). */
  r.get('/', (req, res) => res.json(schema.listTables().filter((t) => data.canRead(t, req.user))));

  r.get('/:table/schema', (req, res) => {
    const t = schema.requireTable(req.params.table);
    data.assertRead(t, req.user);
    res.json(t);
  });

  r.get('/:table', (req, res) => {
    const { page, pageSize, sort, order, search, q, ...rest } = req.query;
    const filters: Record<string, string> = {};
    for (const [k, v] of Object.entries(rest)) {
      const m = /^filter\[(.+)\]$/.exec(k);
      if (m && typeof v === 'string') filters[m[1]] = v;
    }
    // Express' default query parser turns filter[x]=y into { filter: { x: 'y' } }
    const nested = (rest as Record<string, unknown>).filter;
    if (nested && typeof nested === 'object') for (const [k, v] of Object.entries(nested)) if (typeof v === 'string') filters[k] = v;

    res.json(
      data.list(
        req.params.table,
        {
          page: page ? Number(page) : undefined,
          pageSize: pageSize ? Number(pageSize) : undefined,
          sort: str(sort),
          order: str(order) === 'asc' ? 'asc' : 'desc',
          search: str(search) ?? str(q),
          filters,
        },
        req.user,
      ),
    );
  });
  r.post('/:table', (req, res) => res.status(201).json(data.create(req.params.table, req.body, req.user)));
  r.get('/:table/:id', (req, res) => res.json(data.get(req.params.table, idParam(req.params.id), req.user)));
  r.patch('/:table/:id', (req, res) => res.json(data.update(req.params.table, idParam(req.params.id), req.body, req.user)));
  r.delete('/:table/:id', (req, res) => {
    data.remove(req.params.table, idParam(req.params.id), req.user);
    res.status(204).end();
  });
  return r;
}

export function usersRouter(db: DB): Router {
  const r = Router();
  r.use(requireAdmin);
  r.get('/', (_req, res) => res.json(listUsers(db)));
  r.patch('/:id', (req, res) => {
    const { role } = z.object({ role: z.enum(['user', 'admin']) }).parse(req.body);
    const id = idParam(req.params.id);
    if (id === req.user!.id && role !== 'admin') throw badRequest('You cannot remove your own admin role');
    res.json(setUserRole(db, id, role));
  });
  return r;
}
