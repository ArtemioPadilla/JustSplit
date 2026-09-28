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

## Amendment (2026-09-28, plan B12): group membership lifecycle

### Context

Building the groups islands (list, new, view; `risk:high` because it adds
`expense_groups` write paths — create, member management, attach, delete —
over `src/lib/data/repos/groups.ts`) surfaced three consequences of this
ADR's own schema/RLS choices that were previously only latent:

1. **Removing a member can make existing rows uneditable forever.**
   `expenses_update`/`events_update`'s group branch requires
   `expenses.member_ids <@ g.member_ids` (this file's own inventory table).
   If an admin removes a member who still appears in `member_ids` on one of
   the group's expenses or events, that row's `member_ids` is no longer a
   subset of the group's — the WITH CHECK then rejects EVERY future update
   to that row, by ANYONE, forever (short of a migration). There is no
   policy clause that can express "but only if nobody still needs them" —
   this is a pure client-side preflight question.
2. **Deleting a group ungroups its rows into the no-group branch**, which
   has a DIFFERENT WITH CHECK: every member other than the acting admin
   must be that admin's accepted friend (mirrors `violatesNoGroupInvariant`,
   plan B10's own amendment addendum below). A group whose expenses/events
   include members the deleting admin isn't friends with can never be fully
   ungrouped-then-deleted — the ungrouping update itself would be denied
   row by row, leaving the group half-ungrouped.
3. **`batch_write`'s DELETE op is a silent no-op when denied or the row
   isn't visible** (`db/migrations/20260928000008_batch_write.sql`: only
   `set`/`update` raise `no_data_found`; `delete` just affects 0 rows and
   still counts as "applied"). A batch that ungroups every row and then
   deletes the group can report `{ success: true }` from `batch_write`
   while the group row is still there — "the RPC didn't error" is never
   proof the delete actually happened.

Separately, `group.totalExpenses` (this ADR's own `expense_groups` column,
carried into the universal `ExpenseGroup`) has no writer that keeps it in
sync: B9's expense delete, B10's expense create, and this issue's own
attach/delete flows all touch `expenses.group_id`/`member_ids` without ever
touching `expense_groups.total_expenses`, and the field has no currency of
its own (a group with multi-currency expenses has no single meaningful
total in one number anyway). Left as originally shipped, the UI would show
a number that drifts from day one and is wrong the moment a second
currency enters the group.

### Decision

**Member removal preflight** (`src/domain/groups.ts#memberRemovalBlockerCount`,
wired in `MembersSection`): before offering Remove on a member, count how
many of the group's own expenses/events still carry that member in
`memberIds`. A nonzero count disables Remove and shows an honest inline
message ("Alex is still part of 3 expenses in this group, so they can't be
removed yet.") instead of letting the admin discover the permanent
lockout after the fact. **Never let the sole remaining admin remove or
demote themselves** (`isLastAdmin`) — a group with zero admins can never
be managed or deleted again by anyone.

**Group delete preflights** (`repos.groups.remove`, before any write):

- (a) the caller must be a FRESH read of `adminIds` — `GroupDeleteNotAllowedError`
  otherwise (mirrors B9's own `remove()` preflight amendment above: a
  client-side safety check, never authorization — `expense_groups_delete`
  RLS is the actual authority).
- (b) every group expense/event is checked against the no-group invariant
  (`violatesNoGroupInvariant`, plan B10) with the ACTING ADMIN as the
  reference user; any violation raises `GroupDeleteBlockedByFriendshipError`
  with the message "This group can't be deleted yet: some of its expenses
  include people you aren't friends with." BEFORE any write runs.

**Honest post-write verification**: after the one `batchWrite` (ungroup
every row, delete the group), `remove()` re-reads the group. If it is still
there — `batch_write` reported success but the DELETE op was itself a
silent no-op — `GroupDeleteVerificationFailedError` is thrown with a
message naming exactly what happened: the rows were ungrouped, but the
group itself could not be deleted. `attachExpenses`/`attachEvents` apply
the same discipline for their own batch: a per-row re-read after the write
decides `attached` vs `skipped`, so a row the batch didn't actually change
is never reported as a success (`{ attached, skipped }`, never a bare
boolean).

**`totalExpenses` is written and then ignored** (`buildCreateGroupInput`
writes `totalExpenses: 0` because the write-input schema still requires the
field — see `src/schemas/group.ts`'s own header on `CreateExpenseGroupInputSchema`
— but nothing else in this issue, B9, or B10 ever updates it again).
`GroupDetailView` shows the SUM OF THE CURRENTLY LOADED expense rows,
converted to the viewer's chosen display currency, instead — never
`group.totalExpenses`. This is a deliberate, recorded deviation from a
maintained running total, not an oversight: fixing it for real needs
either a trigger/RPC that maintains the column transactionally on every
write path that touches `group_id`, or dropping the column and deriving
the total client-side always (this amendment's own choice) — deferred as
a Track D/D1 question rather than solved here with a partial, easily-
drifting patch.

### Alternatives considered

- **A `SECURITY DEFINER` RPC that ungroups and deletes atomically, raising
  on any row it can't ungroup.** Rejected for the same reason B9's
  amendment rejected the equivalent for expense delete: no migration
  budget in this issue, and the client-side preflight (check before ANY
  write, mirroring the same friendship rule the RLS branch itself uses)
  closes the actual failure mode without new backend surface.
- **Trust `batch_write`'s reported success unconditionally.** Rejected
  once the DELETE-op-is-a-silent-no-op contract was traced through — it
  would have shipped a UI that tells the admin "Group deleted" while the
  group is still there and still visible to every other member.
- **Maintain `totalExpenses` with a per-write increment/decrement in every
  mutation that touches a group expense.** Rejected for this issue: it
  would need to land in B9's and B10's own repos too (already merged,
  `risk:high` themselves), multiplies the places a number can drift from
  reality, and still wouldn't have a currency. Deferred to the schema
  question below.

### Consequences

**Positive** — the three RLS-shaped traps above are each closed by a
preflight that fails BEFORE any write, with an honest, specific message
naming what's actually wrong, rather than a confusing round-trip failure or
(worse) a false "success" toast; `totalExpenses`'s drift is named and
avoided rather than silently shipped as a wrong number.

**Negative** — `remove()` now makes several extra reads (the group,
its expenses, its events, the caller's friendships) before the first
write, on every call, even the common already-safe case; `attachExpenses`/
`attachEvents` make one extra read per attempted row after the batch to
verify it landed. Accepted: these are all indexed point reads/queries
against one admin action, not a hot path.

**Neutral** — no new migration, policy or guard trigger; every rule this
amendment encodes client-side already existed in
`db/migrations/20260928000004_rls_policies.sql`/`…000005_guard_triggers.sql`/
`…000008_batch_write.sql` before this issue.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The acting admin | Before this fix, deleting a group with certain expenses/events could leave it half-ungrouped-and-undeletable, or falsely reported as deleted while it silently survived. Removing a member still on group rows would have permanently locked those rows out of any future edit, discovered only much later. | `repos.groups.remove`'s preflights (admin-only, the friendship-invariant check) and post-write verification run before/after the one batch; `MembersSection`'s removal preflight blocks the member-removal trap up front, with an honest count. |
| A member the admin wants to remove, who is still on a group expense/event | Without this fix, they could be removed and then find (or never find, since nothing tells them) that the shared expense they're still part of can never be edited by anyone again. | Removal is blocked entirely until every group row that still names them is resolved (either that row leaves the group too, or the member stays) — the admin sees why, before acting, not after. |
| Other members of the group | A silently-undeleted-but-reported-as-deleted group would keep showing up in their own group list with no explanation of why "deletion" didn't do anything from the admin's side; a permanently-locked row would surface as an inexplicable Save failure with no context. | The admin gets the honest failure/blocked message at the point of action, which is the actionable moment — before any of this reaches another member's session at all. |
| Future contributors | The next person adding a multi-step batch write (settle-up, B14) has no prior written precedent for "verify a `batch_write` DELETE actually happened" or for "preflight the SAME invariant an update's own WITH CHECK will enforce, so a partial batch never runs at all." | This amendment documents both patterns with a working example (`repos.groups.remove`) each future `batchWrite` caller can cite instead of rediscovering the DELETE-silent-no-op trap or the preflight-before-any-write shape from scratch. |

### Open schema question (not decided here)

This amendment's member-removal lockout and B10's own addendum's
event-visibility limitation (`docs/decisions/0005-supabase-storage-images.md`,
"Amendment (2026-09-28, plan B10 coordinator review): event participant
resolution, the edit gap, and a known limitation") are two faces of the
SAME open question for the schema's eventual owner: **this design has no
way to say "this row belongs to this membership set at write time" that
survives the membership set changing later** — `member_ids`-based RLS
means a row's future editability is governed entirely by the CURRENT state
of a group/friendship graph, never by what it looked like when the row was
created. Candidate shapes for whoever picks this up (neither decided,
neither implemented, by this amendment or B10's):

- RLS clauses keyed to the row's `created_by` or to its OLD `member_ids`
  (a "the set of people who could always see this row never shrinks
  arbitrarily" invariant), rather than solely the CURRENT actor's
  friendships/group membership;
- a real `event_id` column (replacing the current `eventId` overflow key)
  with its own event-membership-aware RLS, closing B10's addendum's gap
  directly and possibly offering a template for a `group_id`-shaped
  "historical membership" column too;
- foreign keys with defined `ON DELETE`/`ON UPDATE` actions somewhere in
  this graph, which the current design has nowhere (spec D9's overflow
  keys and `member_ids` denormalisation were both chosen specifically to
  avoid needing them — revisiting that trade-off is itself part of the
  question, not a foregone conclusion).

## Supersedes

None.

## References

- Spec D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2, B2b, B5a, B18: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `db/migrations/`, `src/tests/rls/`, `scripts/rls-mutation-check.mjs`, `scripts/db-audit.sh`
- ADR 0011 (Supabase via the CyberEco data layer)
- `cyber-eco/cybereco-hub`: `docs/design/permissions-rls-doctrine.md`,
  `docs/design/schema-map-strategy.md`, `docs/design/storage-adapter-contract.md`
- Plan B12 amendment: `docs/decisions/0005-supabase-storage-images.md`'s B9
  delete-ordering-preflight and B10 event-participant-resolution
  amendments (the pattern this amendment's `repos.groups.remove` preflight
  and open schema question both build on); `src/domain/groups.ts`
  (`memberRemovalBlockerCount`, `isLastAdmin`, `withAddedMembers`/
  `withRemovedMember`, the attach filters); `src/lib/data/repos/groups.ts`
  (`remove`, `attachExpenses`, `attachEvents`); `src/lib/data/repos/groups.remove.test.ts`,
  `src/lib/data/repos/groups.attach.test.ts`; `src/components/features/groups/`
  (`MembersSection`, `DeleteGroupDialog`, `AttachRowsPanel`)
