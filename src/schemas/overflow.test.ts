import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { OVERFLOW_KEYS } from './overflow';
import { CreateExpenseGroupInputSchema } from './group';
import { CreateExpenseInputSchema } from './expense';
import { CreateSettlementInputSchema } from './settlement';
import { CreateEventInputSchema } from './event';
import { CreateFriendshipInputSchema } from './friendship';

/**
 * Plan B3 test 1 (the overflow-key-set test): the set of write-input keys
 * with no matching column in `db/migrations/20260928000003_justsplit_tables.sql`
 * must equal the declared list in `src/schemas/overflow.ts`, for every
 * SchemaMap collection. `schema-map.ts` (plan B5a) doesn't exist yet, so this
 * test reads the migration directly — B5a switches it to read the map
 * instead (the declared list becomes the map's job).
 */

const MIGRATION_PATH = resolve(__dirname, '../../db/migrations/20260928000003_justsplit_tables.sql');

function camelToSnake(key: string): string {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/** Minimal, purpose-built parser for this repo's `create table` convention. */
function parseMigrationColumns(sql: string): Record<string, string[]> {
  const tables: Record<string, string[]> = {};
  const tableRegex = /create table public\.(\w+) \(([\s\S]*?)\n\);/g;
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(sql))) {
    const [, tableName, body] = match;
    const columns: string[] = [];
    for (const rawLine of body.split('\n')) {
      const line = rawLine.trim().replace(/,$/, '');
      if (!line || line.startsWith('--') || /^constraint\b/i.test(line)) continue;
      const columnMatch = line.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/);
      if (columnMatch) columns.push(columnMatch[1]);
    }
    tables[tableName] = columns;
  }
  return tables;
}

/** The set of top-level keys of a `Create*Input` Zod object schema. */
function inputKeys(schema: z.ZodObject<z.ZodRawShape>): string[] {
  return Object.keys(schema.shape);
}

/** Keys with no matching column (after camelCase -> snake_case) for a table. */
function overflowKeysOf(keys: string[], columns: string[]): string[] {
  const columnSet = new Set(columns);
  return keys.filter((key) => !columnSet.has(camelToSnake(key)));
}

describe('write-input overflow key set (plan B3, spec D9/D10)', () => {
  const migrationSql = readFileSync(MIGRATION_PATH, 'utf-8');
  const columnsByTable = parseMigrationColumns(migrationSql);

  it('parses columns for all five JustSplit tables from the migration', () => {
    expect(Object.keys(columnsByTable).sort()).toEqual(
      ['events', 'expense_groups', 'expenses', 'friendships', 'settlements'].sort(),
    );
    // Sanity check the parser against a table we know by heart.
    expect(columnsByTable.expenses).toEqual(
      expect.arrayContaining(['id', 'group_id', 'paid_by', 'split_type', 'member_ids', 'created_by', 'extra']),
    );
  });

  const cases: Array<[keyof typeof OVERFLOW_KEYS, z.ZodObject<z.ZodRawShape>]> = [
    ['expense_groups', CreateExpenseGroupInputSchema],
    ['expenses', CreateExpenseInputSchema],
    ['settlements', CreateSettlementInputSchema],
    ['events', CreateEventInputSchema],
    ['friendships', CreateFriendshipInputSchema],
  ];

  it.each(cases)('%s: write-input keys with no column equal the declared overflow list', (collection, schema) => {
    const columns = columnsByTable[collection];
    expect(columns).toBeDefined();

    const computed = overflowKeysOf(inputKeys(schema), columns).sort();
    const declared = [...OVERFLOW_KEYS[collection]].sort();

    expect(computed).toEqual(declared);
  });
});
