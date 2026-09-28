/**
 * Declared overflow key lists, per SchemaMap collection (plan B3, spec D9/D10).
 *
 * `src/lib/data/schema-map.ts` (plan B5a) doesn't exist yet, so this module
 * is the interim, auditable source of truth for "which top-level write-input
 * keys have no mapped column and are routed by the adapter into the `extra`
 * jsonb overflow column." `src/schemas/overflow.test.ts` proves this list
 * equals, for every collection, the set of `Create*Input` keys with no
 * column in `db/migrations/20260928000003_justsplit_tables.sql` — the
 * mechanical "no undeclared key reaches `extra`" guard the plan calls for.
 *
 * This only covers keys that a `Create*Input` schema still declares. The
 * spec-D9 forward-compatible fields (`kind`/`settings`/`concepts` on groups,
 * `settings` on events, `conceptId`/`settledAt` on expenses) are `.omit()`ed
 * from the write-input schemas entirely (see each `src/schemas/*.ts`), so
 * they never show up in a write and are absent from these lists too —
 * Track D issue D1 deletes the omit and rewrites this file (or its B5a
 * `schema-map.ts` successor) against the full spec D9 allowlist.
 *
 * `profiles` is intentionally excluded: it is not a SchemaMap collection
 * (spec D10) — its columns are quoted camelCase `text` written flat by
 * `SupabaseProfileStore`, with no `extra` column at all.
 */
export const OVERFLOW_KEYS = {
  expense_groups: [] as readonly string[],
  expenses: ['eventId'] as readonly string[],
  settlements: ['expenseIds', 'eventId'] as readonly string[],
  events: [] as readonly string[],
  friendships: [] as readonly string[],
} as const;

export type OverflowCollection = keyof typeof OVERFLOW_KEYS;
