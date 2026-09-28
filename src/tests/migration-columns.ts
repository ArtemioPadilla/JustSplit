/**
 * Shared parser for `db/migrations/20260928000003_justsplit_tables.sql`'s
 * `create table` statements (plan B3/B5a). Used by both
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
      if (!line || line.startsWith('--') || /^constraint\b/i.test(line)) continue;
      const columnMatch = line.match(/^"?([a-zA-Z_][a-zA-Z0-9_]*)"?\s+/);
      if (columnMatch) columns.push(columnMatch[1]!);
    }
    tables[tableName!] = columns;
  }
  return tables;
}
