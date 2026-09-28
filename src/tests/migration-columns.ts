import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Shared parser for the `create table` statements of
 * `db/migrations/20260928000003_justsplit_tables.sql` plus every later
 * `alter table public.<t> add column <c> …` (plan B3/B5a; B2d adds
 * `event_id`). Used by both
 * `src/schemas/overflow.test.ts` (write-input keys with no column) and
 * `src/lib/data/schema-map.test.ts` (the SchemaMap's declared `columns` per
 * collection) so the two tests can never drift from two independent parsers.
 */

/** camelCase -> snake_case, the SchemaMap's default field/column rule. */
export function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/** Minimal, purpose-built parser for this repo's `create table` convention. */
export function parseMigrationColumns(sql: string): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  const tableRegex = /create table public\.(\w+) \(([\s\S]*?)\n\);/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql))) {
    const [, tableName, body] = match;
    const columns: string[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      if (!line || line.startsWith('--') || /^constraint\b/i.test(line) || /^check\b/i.test(line)) continue;
      const columnMatch = line.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/);
      if (columnMatch) columns.push(columnMatch[1]!);
    }
    tables[tableName!] = columns;
  }
  return tables;
}

const MIGRATIONS_DIR = resolve(__dirname, '../../db/migrations');

/** The `-- migrate:up` half of a dbmate file (the down section is never part of the schema). */
function upSection(sql: string): string {
  const down = sql.indexOf('-- migrate:down');
  return down === -1 ? sql : sql.slice(0, down);
}

/**
 * Columns of every JustSplit table AFTER all migrations in filename order:
 * `create table` bodies, then `alter table public.<t> add column <c>` lines
 * (B2d). Purpose-built for this repo's conventions, like the parser above.
 */
export function readMigrationColumns(): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = upSection(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf-8'));
    for (const [table, columns] of Object.entries(parseMigrationColumns(sql))) tables[table] = columns;
    for (const m of sql.matchAll(/alter table public\.(\w+)\s+add column (?:if not exists )?"?([a-zA-Z_][a-zA-Z0-9_]*)"?/g)) {
      const [, table, column] = m;
      if (tables[table!] && !tables[table!]!.includes(column!)) tables[table!]!.push(column!);
    }
  }
  return tables;
}
