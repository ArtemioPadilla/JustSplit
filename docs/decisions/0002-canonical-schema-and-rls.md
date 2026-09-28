# 0002 — Canonical schema and Row Level Security for the JustSplit tables

## Status

`Accepted`

Date: 2026-09-28 (spec D10; plan B2 + B2b)

## Context

The client is a static site (ADR 0011): there is no server to enforce
permissions, so Postgres Row Level Security is the only authorization
(`cybereco-hub/docs/design/permissions-rls-doctrine.md` §1.1). Group ledgers
are shared between several users, which rules out the hub's document mode
(`public.documents`, owner-only RLS). Every collection is therefore a real
table in relational mode, addressed through a `SchemaMap` (plan B5a), and the
policies must express the same intent as the app: who may see, create, change
and remove each row.

## Decision

### Inventory: collection → table → policies → trigger

| Collection (SchemaMap) | Table | select | insert | update | delete | Guard trigger |
|---|---|---|---|---|---|---|
| `expense_groups` | `public.expense_groups` | `expense_groups_select` | `expense_groups_insert` | `expense_groups_update` | `expense_groups_delete` | `guard_expense_groups` |
| `expenses` | `public.expenses` | `expenses_select` | `expenses_insert` | `expenses_update` | `expenses_delete` | `guard_expenses` |
| `settlements` | `public.settlements` | `settlements_select` | `settlements_insert` | — (immutable) | `settlements_delete` | `guard_settlements` |
| `events` | `public.events` | `events_select` | `events_insert` | `events_update` | `events_delete` | `guard_events` |
| `friendships` | `public.friendships` | `friendships_select` | `friendships_insert` | `friendships_update` | `friendships_delete` | `guard_friendships` |
| — (not in the map) | `public.profiles` | `profiles_own_row` (FOR ALL, own row) | | | | — |
| — | `public.schema_migrations` | RLS on, no policy, no grant to `anon`/`authenticated` | | | | — |

Storage: bucket `receipts` (private, 5 MiB, `image/*`) with
`receipts_avatars_{select,insert,update,delete}` and
`receipts_expenses_{select,insert,update,delete}` on `storage.objects`.

Functions: `batch_write(jsonb)` (security invoker), `find_profile_by_email(text)`
and `find_profiles_by_ids(text[])` (security definer, pinned `search_path`,
three columns out). All three are executable by `authenticated` only; no
function in `public` is executable by `anon`.

Migrations: `db/migrations/20260928000001…000009` (dbmate), in the plan-B2
order. Every policy is `to authenticated` and compares against
`(select auth.uid())::text`; the SQL is the source of truth, and
`npm run db:audit` prints the live surface for review and for the B18
local-vs-project diff.

### Membership = denormalised `member_ids text[]`

Every shared row carries `member_ids` (the universal `memberIds`), GIN-indexed.
`select` is `uid = any(member_ids)`: no join, no function call, provable per
row, and it maps 1:1 to the adapter's `array-contains` query. The rejected
alternative was a `group_members(group_id, user_id)` junction table plus a
`security definer is_member()` function referenced from every policy: it needs
a join the `StorageAdapter` cannot express and a definer function on every
read. The cost of arrays is denormalisation: a member added to a group later
does not appear in older rows' `member_ids` (spec D9).

### Membership mirror

Insert and update `WITH CHECK` on `expenses`, `events` and `settlements` (and
the insert of `expense_groups`) tie every other id in the row to a
relationship the actor really has: with a `group_id`, `member_ids` must be a
subset of a group the actor belongs to; without one, every other member must
be an accepted friend of the actor. Without the mirror, any signed-up user
could push "you owe me" rows into any other user's lists. If the owner ever
rejects it, this ADR must record "authenticated ≠ trusted: any signed-in user
can push rows into any other user's lists" as an accepted risk, and a
block/hide-user issue is filed before cutover.

### Guard triggers

Policies see only the new row, so the old-vs-new rules are
`guard_<table>()` BEFORE UPDATE triggers (security invoker, pinned
`search_path`): `created_by` is immutable everywhere; on `expense_groups` only
an admin changes `member_ids`/`admin_ids` and every added member must be the
admin's accepted friend; on `friendships` `users`/`requested_by` are immutable
and only the recipient changes `status`. Column-level `revoke update (col)` is
not used: it is a no-op while table UPDATE is granted and breaks every upsert.

### Canonical query per collection

| Collection | Query | Resolves to |
|---|---|---|
| groups, expenses, settlements, events (user lists) | `memberIds array-contains uid` | `member_ids @> '{uid}'` (GIN) |
| friendships | `users array-contains uid` | `users @> '{uid}'` (GIN) |
| a group's expenses / settlements / events | `groupId == id` | `group_id = id` (btree) |
| an event's expenses / settlements | `eventId == id` | `extra->>'eventId' = id` (expression index) |

### The `extra` overflow column

JustSplit-only top-level fields with no column live in `extra jsonb`, written
and read only by the SchemaMap adapter; the app never sees a field named
`extra`. **No policy and no check constraint inspects `extra`** (the coverage
guard fails otherwise), which is what lets Track D add fields without a
migration. Trust statement: every overflow key is writable by any member of
the row and is never protected by RLS.

### `settledAt` and settlements are attestations

`settledAt` is an overflow key on expenses written by settle-up in the same
batch as the `Settlement` insert. Both are **attestations by `created_by`, not
verified payments**: B14 shows "marcado como pagado por <name>", never "paid",
and the ethics checklists of B14 and Track D issue D7 record it.

### `batch_write`

One transaction, security invoker, so a single denied operation aborts the
batch. The table name comes from a fixed allowlist of the five SchemaMap
tables; column names are validated against `information_schema.columns`. A
`set` updates a visible row first and inserts only when none matched, because
an upsert evaluates the INSERT policy against the proposed row even when the
row exists (a partial merge or a non-creator's replace would be denied).

### A missing policy fails CI

The CI job "RLS & contract (supabase start)" runs `npm run test:rls` against a
fresh `supabase start` with the migrations applied: every table × command ×
member / non-member / anonymous cell, the guard cells, storage, functions,
`batch_write`, Realtime and a catalog coverage guard (RLS on every table, a
policy per command, the guard trigger per table, no anon-executable function,
no `public.documents`, nothing reading `extra`). `npm run test:rls:mutation`
drops each policy and guard trigger in turn and requires the suite to go red:
33 of 33 mutations are caught.

## Consequences

**Positive** — authorization is enforced and tested in the database; the
policies are cheap (`select` needs no join); Track D needs no migration; a
regression in a policy or trigger fails CI.

**Negative** — denormalised `member_ids` must be kept in step by the writers
(B5a); the insert/update checks carry an indexed subquery; changing a policy
means a migration plus a suite update.

**Neutral** — `profiles` keeps the hub's own-row policy verbatim; other users'
names and avatars are reachable only through the two lookup functions.

## Supersedes

None.

## References

- Spec D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2, B2b, B5a, B18: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `db/migrations/`, `src/tests/rls/`, `scripts/rls-mutation-check.mjs`, `scripts/db-audit.sh`
- ADR 0011 (Supabase via the CyberEco data layer)
- `cyber-eco/cybereco-hub`: `docs/design/permissions-rls-doctrine.md`,
  `docs/design/schema-map-strategy.md`, `docs/design/storage-adapter-contract.md`
