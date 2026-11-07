/**
 * Types shared by the server (schema builder / data API) and the client
 * (admin UI, generated forms). Keep this file free of Node or DOM imports.
 */

export const FIELD_TYPES = {
  text: { label: 'Text', sql: 'TEXT', description: 'Short single-line text' },
  longtext: { label: 'Long text', sql: 'TEXT', description: 'Multi-line text / markdown' },
  integer: { label: 'Integer', sql: 'INTEGER', description: 'Whole number' },
  number: { label: 'Decimal', sql: 'REAL', description: 'Floating point number' },
  boolean: { label: 'Boolean', sql: 'INTEGER', description: 'True / false' },
  date: { label: 'Date', sql: 'TEXT', description: 'ISO date (YYYY-MM-DD)' },
  datetime: { label: 'Date & time', sql: 'TEXT', description: 'ISO date-time' },
  email: { label: 'Email', sql: 'TEXT', description: 'Validated email address' },
  url: { label: 'URL', sql: 'TEXT', description: 'Validated URL' },
  select: { label: 'Select', sql: 'TEXT', description: 'One value from a fixed list' },
  json: { label: 'JSON', sql: 'TEXT', description: 'Arbitrary JSON value' },
  relation: { label: 'Relation', sql: 'INTEGER', description: 'Reference to a row in another table' },
} as const;

export type FieldType = keyof typeof FIELD_TYPES;
export const FIELD_TYPE_NAMES = Object.keys(FIELD_TYPES) as FieldType[];

export type ReadAccess = 'public' | 'authenticated' | 'admin';
export type WriteAccess = 'authenticated' | 'owner' | 'admin';

export interface FieldOptions {
  /** select: allowed values */
  choices?: string[];
  /** relation: target table name */
  relationTable?: string;
  /** text-ish: length limits; number-ish: value limits */
  min?: number;
  max?: number;
}

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  defaultValue: unknown;
  options: FieldOptions;
  description: string | null;
  position: number;
}

export interface TableDef {
  name: string;
  label: string;
  description: string | null;
  readAccess: ReadAccess;
  writeAccess: WriteAccess;
  displayField: string | null;
  createdAt: string;
  updatedAt: string;
  fields: FieldDef[];
}

/** Columns every user-defined table gets automatically. */
export const SYSTEM_COLUMNS = ['id', 'created_at', 'updated_at', 'created_by'] as const;

export const IDENTIFIER_RE = /^[a-z][a-z0-9_]{0,47}$/;

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type DataRow = Record<string, unknown> & {
  id: number;
  created_at: string;
  updated_at: string;
  created_by: number | null;
};

export interface AppUser {
  id: number;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthProviderInfo {
  id: string;
  name: string;
  loginUrl: string;
}
