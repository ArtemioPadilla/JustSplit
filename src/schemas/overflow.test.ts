import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { OVERFLOW_KEYS } from './overflow';
import { CreateExpenseGroupInputSchema } from './group';
import { CreateExpenseInputSchema } from './expense';
import { CreateSettlementInputSchema } from './settlement';
import { CreateEventInputSchema } from './event';
import { CreateFriendshipInputSchema } from './friendship';
import { schemaMap } from '@/lib/data/schema-map';
import { camelToSnake, readMigrationColumns } from '@/tests/migration-columns';

/**
 * Plan B3 test 1 (the overflow-key-set test): the set of write-input keys
 * with no matching column in `db/migrations/20260928000003_justsplit_tables.sql`
 * must equal the declared list in `src/schemas/overflow.ts`, for every
 * SchemaMap collection. Plan B5a: `schema-map.ts` now exists and is the
 * source of truth for "which collections exist" (`Object.keys(schemaMap)`,
 * asserted equal to `OVERFLOW_KEYS`'s keys below) — the column parser itself
 * is shared with `src/lib/data/schema-map.test.ts` (`src/tests/migration-columns.ts`)
 * so the two tests can never read the migration two different ways.
 */

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
  const columnsByTable = readMigrationColumns();

  it('parses columns for exactly the SchemaMap\'s collections from the migration', () => {
    expect(Object.keys(columnsByTable).sort()).toEqual(Object.keys(schemaMap).sort());
    // Sanity check the parser against a table we know by heart.
    expect(columnsByTable.expenses).toEqual(
      expect.arrayContaining(['id', 'group_id', 'paid_by', 'split_type', 'member_ids', 'created_by', 'extra']),
    );
  });

  it('eventId is no longer an overflow key: it is the event_id column (ADR 0013)', () => {
    expect(OVERFLOW_KEYS.expenses).not.toContain('eventId');
    expect(OVERFLOW_KEYS.settlements).not.toContain('eventId');
    expect(OVERFLOW_KEYS.settlements).toContain('expenseIds');
  });

  it('OVERFLOW_KEYS declares exactly the SchemaMap\'s collections', () => {
    expect(Object.keys(OVERFLOW_KEYS).sort()).toEqual(Object.keys(schemaMap).sort());
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
