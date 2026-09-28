import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { schemaMap } from './schema-map';
import { parseMigrationColumns } from '@/tests/migration-columns';

/**
 * Plan B5a: `schema-map.ts` is the SchemaMap of spec D10 and doubles as the
 * auditable inventory collection -> table -> columns. This test pins it to
 * the two migrations that must agree with it: the table DDL (columns) and
 * `batch_write`'s fixed collection allowlist (the only place a table name is
 * chosen from caller input, spec D10).
 */

const TABLES_MIGRATION = resolve(__dirname, '../../../db/migrations/20260928000003_justsplit_tables.sql');
const BATCH_WRITE_MIGRATION = resolve(__dirname, '../../../db/migrations/20260928000008_batch_write.sql');
const NON_COLLECTION_COLUMNS = ['id', 'extra', 'created_at', 'updated_at'];

describe('schemaMap (plan B5a, spec D10)', () => {
  it('maps exactly the five JustSplit tables (profiles and schema_migrations are not SchemaMap collections)', () => {
    expect(Object.keys(schemaMap).sort()).toEqual(['events', 'expense_groups', 'expenses', 'friendships', 'settlements'].sort());
  });

  it('the map\'s table list equals db/migrations minus profiles and schema_migrations', () => {
    const sql = readFileSync(TABLES_MIGRATION, 'utf-8');
    const columnsByTable = parseMigrationColumns(sql);
    expect(Object.keys(columnsByTable).sort()).toEqual(Object.keys(schemaMap).sort());
    for (const mapping of Object.values(schemaMap)) {
      expect(columnsByTable).toHaveProperty(mapping.table);
    }
  });

  it("each collection's declared `columns` equals its migration columns minus id/extra/created_at/updated_at", () => {
    const sql = readFileSync(TABLES_MIGRATION, 'utf-8');
    const columnsByTable = parseMigrationColumns(sql);
    for (const [collection, mapping] of Object.entries(schemaMap)) {
      const migrationColumns = columnsByTable[mapping.table]!.filter((c) => !NON_COLLECTION_COLUMNS.includes(c));
      expect([...mapping.columns].sort(), collection).toEqual(migrationColumns.sort());
    }
  });

  it("batch_write's fixed collection allowlist equals Object.keys(schemaMap)", () => {
    const sql = readFileSync(BATCH_WRITE_MIGRATION, 'utf-8');
    const arms = [...sql.matchAll(/when '([a-z_]+)'\s+then\s+'[a-z_]+'/g)].map((m) => m[1]!);
    expect(arms.length).toBeGreaterThan(0);
    expect(arms.sort()).toEqual(Object.keys(schemaMap).sort());
  });

  it('every collection defaults idColumn to "id" and stores overflow in "extra"', () => {
    for (const mapping of Object.values(schemaMap)) {
      expect(mapping.idColumn ?? 'id').toBe('id');
      expect(mapping.jsonbColumn).toBe('extra');
    }
  });

  it('every collection has server-strategy createdAt/updatedAt metadata (D10: server-managed timestamps)', () => {
    for (const mapping of Object.values(schemaMap)) {
      expect(mapping.metadata?.createdAt).toEqual({ field: 'createdAt', column: 'created_at', strategy: 'server' });
      expect(mapping.metadata?.updatedAt).toEqual({ field: 'updatedAt', column: 'updated_at', strategy: 'server' });
    }
  });

  it('no columnMap declares a mapping that is not the default camelCase -> snake_case rule (all five tables follow the default)', () => {
    for (const mapping of Object.values(schemaMap)) {
      expect(mapping.columnMap ?? {}).toEqual({});
    }
  });
});
