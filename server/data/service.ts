import { z } from 'zod';
import type { AppUser, DataRow, FieldDef, Paginated, TableDef } from '../../shared/schema-types';
import { nowIso, type DB } from '../db';
import { badRequest, forbidden, notFound, unauthorized } from '../errors';
import type { SchemaService } from '../schema/service';

/**
 * Generic, metadata-driven CRUD for tables created in the schema builder.
 * Validation, defaults, (de)serialization and access control all come from `_fields` / `_tables`.
 */

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  /** Exact-match filters, e.g. { status: 'open' }. */
  filters?: Record<string, string>;
}

function zodForField(f: FieldDef): z.ZodType {
  const { min, max, choices } = f.options;
  let s: z.ZodType;
  switch (f.type) {
    case 'text':
    case 'longtext': {
      let t = z.string();
      if (min != null) t = t.min(min);
      if (max != null) t = t.max(max);
      s = t;
      break;
    }
    case 'email':
      s = z.email();
      break;
    case 'url':
      s = z.url();
      break;
    case 'integer':
    case 'number': {
      let n = f.type === 'integer' ? z.coerce.number().int() : z.coerce.number();
      if (min != null) n = n.min(min);
      if (max != null) n = n.max(max);
      s = n;
      break;
    }
    case 'boolean':
      s = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform((v) => !!v);
      break;
    case 'date':
      s = z.iso.date();
      break;
    case 'datetime':
      s = z.iso.datetime({ local: true, offset: true });
      break;
    case 'select':
      s = z.enum(choices as [string, ...string[]]);
      break;
    case 'relation':
      s = z.coerce.number().int().positive();
      break;
    case 'json':
      s = z.unknown();
      break;
  }
  return s;
}

function serialize(f: FieldDef, v: unknown): unknown {
  if (v == null) return null;
  if (f.type === 'boolean') return v ? 1 : 0;
  if (f.type === 'json') return JSON.stringify(v);
  return v;
}

function deserialize(table: TableDef, row: Record<string, unknown>): DataRow {
  const out: Record<string, unknown> = { ...row };
  for (const f of table.fields) {
    const v = row[f.name];
    if (v == null) out[f.name] = null;
    else if (f.type === 'boolean') out[f.name] = !!v;
    else if (f.type === 'json') {
      try {
        out[f.name] = JSON.parse(String(v));
      } catch {
        out[f.name] = v;
      }
    }
  }
  return out as DataRow;
}

export class DataService {
  constructor(
    private db: DB,
    private schema: SchemaService,
  ) {}

  // ─────────────────────────── access control ───────────────────────────

  canRead(table: TableDef, user?: AppUser | null): boolean {
    if (table.readAccess === 'public') return true;
    if (!user) return false;
    return table.readAccess === 'authenticated' || user.role === 'admin';
  }

  assertRead(table: TableDef, user?: AppUser | null) {
    if (this.canRead(table, user)) return;
    throw user ? forbidden() : unauthorized();
  }

  private assertWrite(table: TableDef, user: AppUser | null | undefined, row?: DataRow) {
    if (!user) throw unauthorized();
    if (user.role === 'admin') return;
    if (table.writeAccess === 'admin') throw forbidden('Only admins can modify this table');
    if (table.writeAccess === 'owner' && row && row.created_by !== user.id) throw forbidden('You can only modify your own records');
  }

  // ─────────────────────────────── CRUD ───────────────────────────────

  list(tableName: string, query: ListQuery, user?: AppUser | null): Paginated<DataRow> {
    const table = this.schema.requireTable(tableName);
    this.assertRead(table, user);
    const columns = new Set(['id', 'created_at', 'updated_at', 'created_by', ...table.fields.map((f) => f.name)]);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Math.floor(query.pageSize ?? 25)));
    const sort = query.sort && columns.has(query.sort) ? query.sort : 'id';
    const order = query.order === 'asc' ? 'ASC' : 'DESC';

    const where: string[] = [];
    const params: unknown[] = [];
    for (const [k, v] of Object.entries(query.filters ?? {})) {
      if (!columns.has(k)) throw badRequest(`Unknown filter field "${k}"`);
      const f = table.fields.find((x) => x.name === k);
      where.push(`${q(k)} = ?`);
      params.push(f?.type === 'boolean' ? (v === 'true' || v === '1' ? 1 : 0) : v);
    }
    if (query.search) {
      const searchable = table.fields.filter((f) => ['text', 'longtext', 'email', 'url', 'select'].includes(f.type));
      if (searchable.length) {
        where.push(`(${searchable.map((f) => `${q(f.name)} LIKE ? ESCAPE '\\'`).join(' OR ')})`);
        const like = `%${query.search.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        searchable.forEach(() => params.push(like));
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = this.db.prepare(`SELECT COUNT(*) FROM ${q(tableName)} ${whereSql}`).pluck().get(...params) as number;
    const rows = this.db
      .prepare(`SELECT * FROM ${q(tableName)} ${whereSql} ORDER BY ${q(sort)} ${order} LIMIT ? OFFSET ?`)
      .all(...params, pageSize, (page - 1) * pageSize) as Record<string, unknown>[];
    return { rows: rows.map((r) => deserialize(table, r)), total, page, pageSize };
  }

  get(tableName: string, id: number, user?: AppUser | null): DataRow {
    const table = this.schema.requireTable(tableName);
    this.assertRead(table, user);
    return this.find(table, id);
  }

  create(tableName: string, body: unknown, user?: AppUser | null): DataRow {
    const table = this.schema.requireTable(tableName);
    this.assertWrite(table, user);
    const values = this.validate(table, body, 'create');
    const cols = ['created_by', ...Object.keys(values)];
    const fieldMap = new Map(table.fields.map((f) => [f.name, f]));
    const params = [user!.id, ...Object.entries(values).map(([k, v]) => serialize(fieldMap.get(k)!, v))];
    const info = this.db
      .prepare(`INSERT INTO ${q(tableName)} (${cols.map(q).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
      .run(...params);
    return this.find(table, Number(info.lastInsertRowid));
  }

  update(tableName: string, id: number, body: unknown, user?: AppUser | null): DataRow {
    const table = this.schema.requireTable(tableName);
    const existing = this.find(table, id);
    this.assertWrite(table, user, existing);
    const values = this.validate(table, body, 'update');
    const fieldMap = new Map(table.fields.map((f) => [f.name, f]));
    const entries = Object.entries(values);
    if (entries.length) {
      this.db
        .prepare(`UPDATE ${q(tableName)} SET ${entries.map(([k]) => `${q(k)} = ?`).join(', ')}, updated_at = ? WHERE id = ?`)
        .run(...entries.map(([k, v]) => serialize(fieldMap.get(k)!, v)), nowIso(), id);
    }
    return this.find(table, id);
  }

  remove(tableName: string, id: number, user?: AppUser | null): void {
    const table = this.schema.requireTable(tableName);
    const existing = this.find(table, id);
    this.assertWrite(table, user, existing);
    this.db.prepare(`DELETE FROM ${q(tableName)} WHERE id = ?`).run(id);
  }

  private find(table: TableDef, id: number): DataRow {
    const row = this.db.prepare(`SELECT * FROM ${q(table.name)} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) throw notFound(`Record ${id} not found in ${table.name}`);
    return deserialize(table, row);
  }

  /** Validate a payload against field metadata. Unknown keys are rejected. */
  validate(table: TableDef, body: unknown, mode: 'create' | 'update'): Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('Body must be a JSON object');
    const input = { ...(body as Record<string, unknown>) };
    for (const sys of ['id', 'created_at', 'updated_at', 'created_by']) delete input[sys];

    const shape: Record<string, z.ZodType> = {};
    for (const f of table.fields) {
      if (mode === 'create' && input[f.name] === undefined && f.defaultValue != null) input[f.name] = f.defaultValue;
      // Empty strings from forms mean "no value" for non-text types.
      if (input[f.name] === '' && f.type !== 'text' && f.type !== 'longtext') input[f.name] = null;
      const base = zodForField(f);
      shape[f.name] =
        f.required
          ? mode === 'create'
            ? base
            : base.optional()
          : base.nullable().optional();
    }
    const parsed = z.object(shape).strict().parse(input) as Record<string, unknown>;
    for (const k of Object.keys(parsed)) if (parsed[k] === undefined) delete parsed[k];
    return parsed;
  }
}
