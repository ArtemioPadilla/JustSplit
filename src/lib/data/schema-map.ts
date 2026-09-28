/**
 * The `SchemaMap` of spec D10 (plan B5a): relational-mode translation from
 * the documental `StorageAdapter` contract onto the five JustSplit tables of
 * `db/migrations/20260928000003_justsplit_tables.sql` (plus the `event_id` columns
 * of `20260928000010_event_id_column.sql`).
 *
 * Types are LOCAL COPIES of the hub's `SchemaMap`/`CollectionMapping` design
 * (`cybereco-hub/docs/design/schema-map-strategy.md` §2.1) — `@cyber-eco/types`
 * does not export them yet (upstreamed as Track C' H2, ADR 0004). One field is
 * a JustSplit-local extension beyond the hub's base shape: `columns` (see
 * below).
 *
 * `profiles` is deliberately NOT a key here (spec D10): its columns are
 * quoted camelCase `text` written flat by `SupabaseProfileStore`, it has no
 * `extra` overflow column, and `metadata.strategy: 'server'` would address a
 * `created_at`/`updated_at` column that doesn't exist on that table (it's
 * `"createdAt"`/`"updatedAt"` text, hub-managed). Own-row access goes through
 * `SupabaseProfileStore`; cross-user lookup through `repos/profiles.ts`'s two
 * RPC calls. Neither touches `schemaMap`.
 */

export interface MetadataFieldMapping {
  /** The documental field name (e.g. `createdAt`). */
  field: string;
  /** The physical column name (e.g. `created_at`). */
  column: string;
  /**
   * `'server'`: the column is server-managed (`default now()` / an
   * `updated_at` trigger) and is NEVER included in a write — the caller's
   * value (even `adapter.serverTimestamp()`) is dropped by `toRow()`.
   * `'client'`: the value is written as given (unused by any JustSplit
   * collection today — both timestamps are `'server'`, migration D10).
   */
  strategy: 'server' | 'client';
}

export interface MetadataMapping {
  createdAt?: MetadataFieldMapping;
  updatedAt?: MetadataFieldMapping;
}

export interface CollectionMapping {
  /** The physical table name. */
  table: string;
  /** The column acting as the document `id`. Defaults to `'id'`. */
  idColumn?: string;
  /**
   * Field -> column translations that deviate from the default camelCase ->
   * snake_case rule. Empty for every JustSplit table today: every field
   * already follows the default rule (`memberIds` -> `member_ids`, `paidBy`
   * -> `paid_by`, ...), so nothing needs declaring here yet.
   */
  columnMap?: Record<string, string>;
  /** The jsonb overflow column for fields with no mapped column. */
  jsonbColumn?: string;
  /** Server-managed metadata field/column pairs (D10: both `createdAt`/`updatedAt`). */
  metadata?: MetadataMapping;
  /**
   * LOCAL EXTENSION (not part of the hub's base `SchemaMap` shape): the
   * table's real, physical column names, excluding `idColumn`, `jsonbColumn`
   * and the metadata columns. `relational-adapter.ts` needs this allowlist
   * client-side to decide "does this field have a real column, or does it
   * fold into the `extra` overflow" — `batch_write` makes the same decision
   * server-side by querying `information_schema.columns`
   * (`db/migrations/20260928000008_batch_write.sql`); the browser has no such
   * introspection, so the list is declared here and pinned to the migration
   * by `schema-map.test.ts`. A future upstream `SchemaMap` (H2) may resolve
   * this some other way (e.g. a real DB round-trip); this field is a
   * contingency-adapter-only detail, not part of the spec D10 shape other
   * consumers see.
   */
  columns: readonly string[];
}

export type SchemaMap = Record<string, CollectionMapping>;

/** Every JustSplit collection uses the same server-managed timestamp pair. */
const SERVER_TIMESTAMPS: MetadataMapping = {
  createdAt: { field: 'createdAt', column: 'created_at', strategy: 'server' },
  updatedAt: { field: 'updatedAt', column: 'updated_at', strategy: 'server' },
};

export const schemaMap: SchemaMap = {
  expense_groups: {
    table: 'expense_groups',
    idColumn: 'id',
    jsonbColumn: 'extra',
    metadata: SERVER_TIMESTAMPS,
    columns: [
      'name',
      'description',
      'type',
      'currency',
      'members',
      'settings',
      'total_expenses',
      'member_ids',
      'admin_ids',
      'created_by',
    ],
  },
  expenses: {
    table: 'expenses',
    idColumn: 'id',
    jsonbColumn: 'extra',
    metadata: SERVER_TIMESTAMPS,
    columns: [
      'group_id',
      // B2d (ADR 0013): a real column since migration 20260928000010, no longer an `extra` overflow key.
      'event_id',
      'description',
      'amount',
      'currency',
      'paid_by',
      'split_type',
      'splits',
      'date',
      'category',
      'tags',
      'notes',
      'images',
      'source',
      'transaction_id',
      'member_ids',
      'created_by',
    ],
  },
  settlements: {
    table: 'settlements',
    idColumn: 'id',
    jsonbColumn: 'extra',
    metadata: SERVER_TIMESTAMPS,
    columns: [
      'group_id',
      'event_id',
      'from_user_id',
      'to_user_id',
      'amount',
      'currency',
      'date',
      'method',
      'notes',
      'transaction_id',
      'member_ids',
      'created_by',
    ],
  },
  events: {
    table: 'events',
    idColumn: 'id',
    jsonbColumn: 'extra',
    metadata: SERVER_TIMESTAMPS,
    columns: [
      'name',
      'description',
      'group_id',
      'date',
      'start_date',
      'end_date',
      'location',
      'preferred_currency',
      'kind',
      'member_ids',
      'created_by',
    ],
  },
  friendships: {
    table: 'friendships',
    idColumn: 'id',
    jsonbColumn: 'extra',
    metadata: SERVER_TIMESTAMPS,
    columns: ['users', 'status', 'requested_by'],
  },
};

export type SchemaMapCollection = keyof typeof schemaMap;
