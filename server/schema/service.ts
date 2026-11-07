import { z } from 'zod';
import {
  FIELD_TYPE_NAMES,
  FIELD_TYPES,
  IDENTIFIER_RE,
  SYSTEM_COLUMNS,
  type FieldDef,
  type FieldOptions,
  type TableDef,
} from '../../shared/schema-types';
import { NOW_SQL, nowIso, type DB } from '../db';
import { badRequest, conflict, notFound } from '../errors';

/**
 * Schema builder: create / alter / drop application tables at runtime.
 *
 * Metadata lives in `_tables` + `_fields`; the physical SQLite table mirrors it.
 * Every app table gets `id`, `created_at`, `updated_at`, `created_by`.
 * `required` and `default` are enforced by the data layer (so you can add a
 * required field to a table that already has rows); `unique` is a real index.
 * Changing a field's type or dropping a relation column rebuilds the table
 * using SQLite's recommended copy-and-swap procedure.
 */

const RESERVED_TABLES = new Set(['users', 'user_identities', 'sqlite_sequence', 'sqlite_master']);
const RESERVED_COLUMNS = new Set<string>(SYSTEM_COLUMNS);

const identifier = z
  .string()
  .regex(IDENTIFIER_RE, 'Use lowercase letters, digits and underscores; start with a letter (max 48 chars)');

const optionsSchema = z
  .object({
    choices: z.array(z.string().min(1)).optional(),
    relationTable: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict();

export const fieldInput = z.object({
  name: identifier.refine((n) => !RESERVED_COLUMNS.has(n), 'This column name is reserved'),
  label: z.string().min(1).max(100).optional(),
  type: z.enum(FIELD_TYPE_NAMES as [string, ...string[]]),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  options: optionsSchema.default({}),
  description: z.string().max(500).nullish(),
});
export type FieldInput = z.input<typeof fieldInput>;

export const fieldPatch = fieldInput.partial().omit({ name: true }).extend({ name: fieldInput.shape.name.optional() });

const access = {
  readAccess: z.enum(['public', 'authenticated', 'admin']),
  writeAccess: z.enum(['authenticated', 'owner', 'admin']),
};

export const tableInput = z.object({
  name: identifier.refine((n) => !RESERVED_TABLES.has(n), 'This table name is reserved'),
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
  readAccess: access.readAccess.default('authenticated'),
  writeAccess: access.writeAccess.default('admin'),
  displayField: z.string().nullish(),
  fields: z.array(fieldInput).default([]),
});
export type TableInput = z.input<typeof tableInput>;

export const tablePatch = z.object({
  label: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).nullish(),
  readAccess: access.readAccess.optional(),
  writeAccess: access.writeAccess.optional(),
  displayField: z.string().nullish(),
});

const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
const humanize = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

interface TableRow {
  name: string;
  label: string;
  description: string | null;
  read_access: TableDef['readAccess'];
  write_access: TableDef['writeAccess'];
  display_field: string | null;
  created_at: string;
  updated_at: string;
}
interface FieldRow {
  table_name: string;
  name: string;
  label: string;
  type: FieldDef['type'];
  required: number;
  is_unique: number;
  default_value: string | null;
  options: string;
  description: string | null;
  position: number;
}

const toField = (r: FieldRow): FieldDef => ({
  name: r.name,
  label: r.label,
  type: r.type,
  required: !!r.required,
  unique: !!r.is_unique,
  defaultValue: r.default_value == null ? null : JSON.parse(r.default_value),
  options: JSON.parse(r.options) as FieldOptions,
  description: r.description,
  position: r.position,
});

export class SchemaService {
  constructor(private db: DB) {}

  // ───────────────────────────── reads ─────────────────────────────

  listTables(): TableDef[] {
    const tables = this.db.prepare('SELECT * FROM _tables ORDER BY name').all() as TableRow[];
    const fields = this.db.prepare('SELECT * FROM _fields ORDER BY position, id').all() as FieldRow[];
    return tables.map((t) => this.toTable(t, fields.filter((f) => f.table_name === t.name)));
  }

  getTable(name: string): TableDef | null {
    const t = this.db.prepare('SELECT * FROM _tables WHERE name = ?').get(name) as TableRow | undefined;
    if (!t) return null;
    const fields = this.db.prepare('SELECT * FROM _fields WHERE table_name = ? ORDER BY position, id').all(name) as FieldRow[];
    return this.toTable(t, fields);
  }

  requireTable(name: string): TableDef {
    const t = this.getTable(name);
    if (!t) throw notFound(`Table "${name}" not found`);
    return t;
  }

  private toTable(t: TableRow, fields: FieldRow[]): TableDef {
    return {
      name: t.name,
      label: t.label,
      description: t.description,
      readAccess: t.read_access,
      writeAccess: t.write_access,
      displayField: t.display_field,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      fields: fields.map(toField),
    };
  }

  // ──────────────────────────── tables ────────────────────────────

  createTable(raw: TableInput): TableDef {
    const input = tableInput.parse(raw);
    if (this.getTable(input.name) || this.physicalTableExists(input.name)) throw conflict(`Table "${input.name}" already exists`);
    const names = new Set<string>();
    for (const f of input.fields) {
      if (names.has(f.name)) throw badRequest(`Duplicate field "${f.name}"`);
      names.add(f.name);
    }

    this.db.transaction(() => {
      this.db
        .prepare(
          `INSERT INTO _tables (name, label, description, read_access, write_access, display_field) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(input.name, input.label ?? humanize(input.name), input.description ?? null, input.readAccess, input.writeAccess, null);
      const fields = input.fields.map((f, i) => this.normalizeField(input.name, f, i));
      fields.forEach((f) => this.insertFieldMeta(input.name, f));
      this.db.exec(this.createTableSql(input.name, fields));
      fields.forEach((f) => this.createFieldIndexes(input.name, f));
      if (input.displayField) this.updateTable(input.name, { displayField: input.displayField });
      else {
        const firstText = fields.find((f) => f.type === 'text');
        if (firstText) this.db.prepare('UPDATE _tables SET display_field = ? WHERE name = ?').run(firstText.name, input.name);
      }
    })();
    return this.requireTable(input.name);
  }

  updateTable(name: string, raw: z.input<typeof tablePatch>): TableDef {
    const table = this.requireTable(name);
    const p = tablePatch.parse(raw);
    if (p.displayField && !table.fields.some((f) => f.name === p.displayField) && p.displayField !== 'id') {
      throw badRequest(`displayField "${p.displayField}" is not a field of ${name}`);
    }
    this.db
      .prepare(
        `UPDATE _tables SET
          label = COALESCE(?, label),
          description = CASE WHEN ? THEN ? ELSE description END,
          read_access = COALESCE(?, read_access),
          write_access = COALESCE(?, write_access),
          display_field = CASE WHEN ? THEN ? ELSE display_field END,
          updated_at = ?
        WHERE name = ?`,
      )
      .run(
        p.label ?? null,
        p.description !== undefined ? 1 : 0,
        p.description ?? null,
        p.readAccess ?? null,
        p.writeAccess ?? null,
        p.displayField !== undefined ? 1 : 0,
        p.displayField ?? null,
        nowIso(),
        name,
      );
    return this.requireTable(name);
  }

  dropTable(name: string): void {
    this.requireTable(name);
    const refs = this.referencingFields(name).filter((r) => r.table_name !== name);
    if (refs.length) {
      throw conflict(`Cannot drop "${name}": referenced by ${refs.map((r) => `${r.table_name}.${r.name}`).join(', ')}`);
    }
    this.db.transaction(() => {
      this.db.exec(`DROP TABLE IF EXISTS ${q(name)}`);
      this.db.prepare('DELETE FROM _tables WHERE name = ?').run(name);
    })();
  }

  // ──────────────────────────── fields ────────────────────────────

  addField(tableName: string, raw: FieldInput): TableDef {
    const table = this.requireTable(tableName);
    const parsed = fieldInput.parse(raw);
    if (table.fields.some((f) => f.name === parsed.name)) throw conflict(`Field "${parsed.name}" already exists`);
    const field = this.normalizeField(tableName, parsed, table.fields.length);
    this.db.transaction(() => {
      this.insertFieldMeta(tableName, field);
      this.db.exec(`ALTER TABLE ${q(tableName)} ADD COLUMN ${this.columnSql(field)}`);
      this.createFieldIndexes(tableName, field);
      this.touch(tableName);
    })();
    return this.requireTable(tableName);
  }

  updateField(tableName: string, fieldName: string, raw: z.input<typeof fieldPatch>): TableDef {
    const table = this.requireTable(tableName);
    const current = table.fields.find((f) => f.name === fieldName);
    if (!current) throw notFound(`Field "${fieldName}" not found`);
    const patch = fieldPatch.parse(raw);
    const newName = patch.name ?? current.name;
    if (newName !== current.name && table.fields.some((f) => f.name === newName)) throw conflict(`Field "${newName}" already exists`);

    const next = this.normalizeField(
      tableName,
      {
        name: newName,
        label: patch.label ?? current.label,
        type: patch.type ?? current.type,
        required: patch.required ?? current.required,
        unique: patch.unique ?? current.unique,
        defaultValue: 'defaultValue' in patch ? patch.defaultValue : current.defaultValue,
        options: patch.options ?? current.options,
        description: patch.description !== undefined ? patch.description : current.description,
      },
      current.position,
    );

    const structural =
      next.type !== current.type ||
      (next.type === 'relation' && next.options.relationTable !== current.options.relationTable);

    this.db.transaction(() => {
      this.dropFieldIndexes(tableName, current.name);
      if (newName !== current.name) {
        this.db.exec(`ALTER TABLE ${q(tableName)} RENAME COLUMN ${q(current.name)} TO ${q(newName)}`);
        this.db.prepare('UPDATE _tables SET display_field = ? WHERE name = ? AND display_field = ?').run(newName, tableName, current.name);
      }
      this.db
        .prepare(
          `UPDATE _fields SET name = ?, label = ?, type = ?, required = ?, is_unique = ?, default_value = ?, options = ?, description = ?
           WHERE table_name = ? AND name = ?`,
        )
        .run(
          next.name,
          next.label,
          next.type,
          next.required ? 1 : 0,
          next.unique ? 1 : 0,
          next.defaultValue == null ? null : JSON.stringify(next.defaultValue),
          JSON.stringify(next.options),
          next.description,
          tableName,
          current.name,
        );
      if (!structural) this.createFieldIndexes(tableName, next);
      this.touch(tableName);
    })();

    if (structural) this.rebuildTable(tableName);
    return this.requireTable(tableName);
  }

  removeField(tableName: string, fieldName: string): TableDef {
    const table = this.requireTable(tableName);
    const field = table.fields.find((f) => f.name === fieldName);
    if (!field) throw notFound(`Field "${fieldName}" not found`);
    this.db.transaction(() => {
      this.dropFieldIndexes(tableName, fieldName);
      this.db.prepare('DELETE FROM _fields WHERE table_name = ? AND name = ?').run(tableName, fieldName);
      this.db.prepare('UPDATE _tables SET display_field = NULL WHERE name = ? AND display_field = ?').run(tableName, fieldName);
      // SQLite cannot DROP COLUMN on a foreign-key column; rebuild for relations.
      if (field.type !== 'relation') this.db.exec(`ALTER TABLE ${q(tableName)} DROP COLUMN ${q(fieldName)}`);
      this.touch(tableName);
    })();
    if (field.type === 'relation') this.rebuildTable(tableName);
    return this.requireTable(tableName);
  }

  reorderFields(tableName: string, names: string[]): TableDef {
    const table = this.requireTable(tableName);
    const known = new Set(table.fields.map((f) => f.name));
    if (names.length !== known.size || !names.every((n) => known.has(n))) {
      throw badRequest('Order must list every field exactly once');
    }
    const stmt = this.db.prepare('UPDATE _fields SET position = ? WHERE table_name = ? AND name = ?');
    this.db.transaction(() => names.forEach((n, i) => stmt.run(i, tableName, n)))();
    return this.requireTable(tableName);
  }

  // ─────────────────────── export / import / types ───────────────────────

  exportSchema() {
    return {
      version: 1,
      exportedAt: nowIso(),
      tables: this.listTables().map((t) => ({
        name: t.name,
        label: t.label,
        description: t.description,
        readAccess: t.readAccess,
        writeAccess: t.writeAccess,
        displayField: t.displayField,
        fields: t.fields.map(({ position: _p, ...f }) => f),
      })),
    };
  }

  /** Additive import: creates missing tables and fields; never drops anything. */
  importSchema(doc: { tables: TableInput[] }): { createdTables: string[]; addedFields: string[] } {
    const createdTables: string[] = [];
    const addedFields: string[] = [];
    // Create tables without relation fields first so cross-references resolve in any order.
    const tables = z.array(tableInput).parse(doc.tables);
    for (const t of tables) {
      if (!this.getTable(t.name)) {
        this.createTable({ ...t, displayField: undefined, fields: t.fields.filter((f) => f.type !== 'relation') });
        createdTables.push(t.name);
      }
    }
    for (const t of tables) {
      const existing = this.requireTable(t.name);
      for (const f of t.fields) {
        if (!existing.fields.some((e) => e.name === f.name)) {
          this.addField(t.name, f);
          addedFields.push(`${t.name}.${f.name}`);
        }
      }
      this.updateTable(t.name, {
        label: t.label,
        description: t.description,
        readAccess: t.readAccess,
        writeAccess: t.writeAccess,
        ...(t.displayField ? { displayField: t.displayField } : {}),
      });
    }
    return { createdTables, addedFields };
  }

  generateTypes(): string {
    const tsType: Record<string, string> = {
      text: 'string', longtext: 'string', email: 'string', url: 'string', date: 'string', datetime: 'string',
      integer: 'number', number: 'number', relation: 'number', boolean: 'boolean', json: 'unknown', select: 'string',
    };
    const pascal = (s: string) => s.replace(/(^|_)(\w)/g, (_m, _u, c: string) => c.toUpperCase());
    const out = ['// Generated by App Starter Data Builder. Do not edit by hand.', ''];
    for (const t of this.listTables()) {
      out.push(`/** ${t.label}${t.description ? ` — ${t.description}` : ''} */`);
      out.push(`export interface ${pascal(t.name)} {`);
      out.push('  id: number;', '  created_at: string;', '  updated_at: string;', '  created_by: number | null;');
      for (const f of t.fields) {
        const type = f.type === 'select' && f.options.choices?.length ? f.options.choices.map((c) => JSON.stringify(c)).join(' | ') : tsType[f.type];
        if (f.description) out.push(`  /** ${f.description} */`);
        out.push(`  ${f.name}: ${type}${f.required ? '' : ' | null'};`);
      }
      out.push('}', '');
    }
    return out.join('\n');
  }

  // ─────────────────────────── internals ───────────────────────────

  private normalizeField(tableName: string, f: z.output<typeof fieldInput> | (Omit<FieldDef, 'position'> & { label?: string }), position: number): FieldDef {
    const options: FieldOptions = { ...(f.options ?? {}) };
    if (f.type === 'select') {
      if (!options.choices?.length) throw badRequest(`Select field "${f.name}" needs at least one choice`);
    } else delete options.choices;
    if (f.type === 'relation') {
      if (!options.relationTable) throw badRequest(`Relation field "${f.name}" needs options.relationTable`);
      if (options.relationTable !== tableName && !this.getTable(options.relationTable) && options.relationTable !== 'users') {
        throw badRequest(`Relation target "${options.relationTable}" does not exist`);
      }
    } else delete options.relationTable;
    return {
      name: f.name,
      label: f.label ?? humanize(f.name),
      type: f.type as FieldDef['type'],
      required: !!f.required,
      unique: !!f.unique,
      defaultValue: f.defaultValue ?? null,
      options,
      description: f.description ?? null,
      position,
    };
  }

  private insertFieldMeta(tableName: string, f: FieldDef) {
    this.db
      .prepare(
        `INSERT INTO _fields (table_name, name, label, type, required, is_unique, default_value, options, description, position)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        tableName,
        f.name,
        f.label,
        f.type,
        f.required ? 1 : 0,
        f.unique ? 1 : 0,
        f.defaultValue == null ? null : JSON.stringify(f.defaultValue),
        JSON.stringify(f.options),
        f.description,
        f.position,
      );
  }

  private columnSql(f: FieldDef): string {
    let sql = `${q(f.name)} ${FIELD_TYPES[f.type].sql}`;
    if (f.type === 'relation') sql += ` REFERENCES ${q(f.options.relationTable!)}(id) ON DELETE SET NULL`;
    return sql;
  }

  private createTableSql(name: string, fields: FieldDef[], physicalName = name): string {
    const cols = [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      `created_at TEXT NOT NULL DEFAULT (${NOW_SQL})`,
      `updated_at TEXT NOT NULL DEFAULT (${NOW_SQL})`,
      'created_by INTEGER REFERENCES users(id) ON DELETE SET NULL',
      ...fields.map((f) => this.columnSql(f)),
    ];
    return `CREATE TABLE ${q(physicalName)} (\n  ${cols.join(',\n  ')}\n)`;
  }

  private createFieldIndexes(table: string, f: FieldDef) {
    if (f.unique) this.db.exec(`CREATE UNIQUE INDEX ${q(`ux_${table}_${f.name}`)} ON ${q(table)}(${q(f.name)})`);
    else if (f.type === 'relation') this.db.exec(`CREATE INDEX ${q(`ix_${table}_${f.name}`)} ON ${q(table)}(${q(f.name)})`);
  }

  private dropFieldIndexes(table: string, field: string) {
    this.db.exec(`DROP INDEX IF EXISTS ${q(`ux_${table}_${field}`)}; DROP INDEX IF EXISTS ${q(`ix_${table}_${field}`)};`);
  }

  private referencingFields(target: string) {
    return (this.db.prepare(`SELECT table_name, name, options FROM _fields WHERE type = 'relation'`).all() as FieldRow[]).filter(
      (r) => (JSON.parse(r.options) as FieldOptions).relationTable === target,
    );
  }

  private physicalTableExists(name: string) {
    return !!this.db.prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?`).get(name);
  }

  private touch(table: string) {
    this.db.prepare('UPDATE _tables SET updated_at = ? WHERE name = ?').run(nowIso(), table);
  }

  /**
   * Recreate the physical table from metadata, keeping all rows.
   * https://www.sqlite.org/lang_altertable.html#otheralter
   */
  private rebuildTable(name: string) {
    const table = this.requireTable(name);
    const tmp = `${name}__rebuild`;
    const existingCols = new Set(
      (this.db.prepare(`PRAGMA table_info(${q(name)})`).all() as { name: string }[]).map((c) => c.name),
    );
    const cols = [...SYSTEM_COLUMNS, ...table.fields.map((f) => f.name)].filter((c) => existingCols.has(c)).map(q).join(', ');

    this.db.pragma('foreign_keys = OFF');
    try {
      this.db.transaction(() => {
        this.db.exec(this.createTableSql(name, table.fields, tmp));
        this.db.exec(`INSERT INTO ${q(tmp)} (${cols}) SELECT ${cols} FROM ${q(name)}`);
        this.db.exec(`DROP TABLE ${q(name)}`);
        this.db.exec(`ALTER TABLE ${q(tmp)} RENAME TO ${q(name)}`);
        table.fields.forEach((f) => {
          this.dropFieldIndexes(name, f.name);
          this.createFieldIndexes(name, f);
        });
        const problems = this.db.pragma(`foreign_key_check(${q(name)})`) as unknown[];
        if (problems.length) throw badRequest('Rebuild would violate foreign keys', problems);
      })();
    } finally {
      this.db.pragma('foreign_keys = ON');
    }
  }
}
