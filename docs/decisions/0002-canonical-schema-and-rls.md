# 0002 — Canonical schema and Row Level Security for the JustSplit tables

## Status

`Accepted` (the `expenses`, `settlements` and `events` policies and guards were
changed by [ADR 0013](./0013-membership-lifecycle.md), plan B2d)

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

> **Superseded in part by [0014](./0014-settlements-ledger.md) (B14a):** settle-up no longer writes
> `settledAt`; a settlement is a single insert and `settledAt` is legacy and read-only. The trust
> statement below stands.

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

> **Superseded by [ADR 0013](./0013-membership-lifecycle.md)** (plan B2d): the member-removal preflight, the group-delete friendship preflight and the open schema question below are resolved by foreign keys, live group/event visibility and added-members-only edit checks. Kept below as the historical record.

### Context

Building the groups islands (list, new, view; `risk:high` because it adds
`expense_groups` write paths — create, member management, attach, delete —
over `src/lib/data/repos/groups.ts`) surfaced four consequences of this
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
4. **`repos.groups.remove`'s preflight and its ungrouping batch only ever
   see the rows the acting admin can READ** — `expenses_select`/
   `events_select` are `uid = any(member_ids)`, so `listForGroup(id)`
   silently returns a SUBSET of the group's true row set whenever a group
   row's `member_ids` doesn't include the admin doing the deleting. Such a
   row would be neither preflight-checked, nor ungrouped, nor even known
   about by the batch — it keeps its `group_id` pointing at a now-deleted
   group. Its own `expenses_update`/`events_update` group branch
   (`exists (select 1 from public.expense_groups g where g.id =
   expenses.group_id and …)`) then fails for EVERYONE, since the group row
   no longer exists — the same "uneditable forever" failure mode as
   consequence 1, reached a different way, and NOT closed by this
   amendment's member-removal preflight (that preflight only guards
   `MembersSection`'s own Remove action, not this).

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

**Known limitation, recorded honestly (context item 4, coordinator
review)** — a group row whose `member_ids` doesn't include the acting
admin survives `repos.groups.remove` with its `group_id` still pointing
at the now-deleted group, permanently unreachable by the group-branch
update check. **This cannot arise through the app today**: B10's create
and this issue's own `attachExpenses`/`attachEvents` always write
`memberIds: group.memberIds` (so a group row's members are always a
subset of the group's, never a superset that could exclude an admin),
`MembersSection`'s removal preflight blocks removing a member still on
any group row, and `guard_expense_groups` only lets an admin add a member
who is already added TO the group's own `member_ids` — an admin cannot
be silently absent from a row that still legitimately belongs to their
own group's membership. **It could arise from a direct API write**
(a hand-crafted `insert`/`update` bypassing this app's own repos, or a
future caller that doesn't maintain the `memberIds ⊆ group.memberIds`
invariant) — accepted as a narrow, unclosed gap rather than silently
assumed impossible; see the open schema question below for the shape
that would close it for real.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The acting admin | Before this fix, deleting a group with certain expenses/events could leave it half-ungrouped-and-undeletable, or falsely reported as deleted while it silently survived. Removing a member still on group rows would have permanently locked those rows out of any future edit, discovered only much later. | `repos.groups.remove`'s preflights (admin-only, the friendship-invariant check) and post-write verification run before/after the one batch; `MembersSection`'s removal preflight blocks the member-removal trap up front, with an honest count. |
| A member the admin wants to remove, who is still on a group expense/event | Without this fix, they could be removed and then find (or never find, since nothing tells them) that the shared expense they're still part of can never be edited by anyone again. | Removal is blocked entirely until every group row that still names them is resolved (either that row leaves the group too, or the member stays) — the admin sees why, before acting, not after. |
| Other members of the group | A silently-undeleted-but-reported-as-deleted group would keep showing up in their own group list with no explanation of why "deletion" didn't do anything from the admin's side; a permanently-locked row would surface as an inexplicable Save failure with no context. | The admin gets the honest failure/blocked message at the point of action, which is the actionable moment — before any of this reaches another member's session at all. |
| Future contributors | The next person adding a multi-step batch write (settle-up, B14) has no prior written precedent for "verify a `batch_write` DELETE actually happened" or for "preflight the SAME invariant an update's own WITH CHECK will enforce, so a partial batch never runs at all." | This amendment documents both patterns with a working example (`repos.groups.remove`) each future `batchWrite` caller can cite instead of rediscovering the DELETE-silent-no-op trap or the preflight-before-any-write shape from scratch. |

### Open schema question (not decided here)

This amendment's member-removal lockout, its own context item 4 (a group
row invisible to the deleting admin surviving that group's deletion,
recorded as a known limitation above), and B10's own addendum's
event-visibility limitation (`docs/decisions/0005-supabase-storage-images.md`,
"Amendment (2026-09-28, plan B10 coordinator review): event participant
resolution, the edit gap, and a known limitation") are three faces of the
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
  question, not a foregone conclusion). A `group_id` foreign key with
  `ON DELETE SET NULL` specifically would close context item 4 outright —
  a deleted group could no longer leave any row pointing at it, visible or
  not to whoever did the deleting, without this amendment's own
  read-then-ungroup client-side choreography having to be correct or
  complete in the first place.

## Amendment (2026-09-29, plan B19b): group member roles are enum-checked

`risk:high`: a migration. ADR 0002 owns the schema and the group-membership
rows (the B12 amendment above and [ADR 0013](./0013-membership-lifecycle.md)
changed who may see and edit them, not what `members[]` may contain), so the
role constraint is recorded here.

### Context

The only place a member role is stored is the `expense_groups.members` jsonb
array (`[{ userId, displayName, role, joinedAt, invitedBy? }]`). The app parses
`role` as `owner | admin | moderator | member`, but the database accepted any
JSON there. The RLS fixtures wrote `'user'`; one such member made
`ExpenseGroupSchema.parse` throw, so `GroupDetailView` (and every page that loads
the group: `/events/new?group=`, the dashboard) showed "Something went wrong"
with no way to recover from the UI.

Authorization never read that field. RLS and `guard_expense_groups` decide from
`admin_ids`, which `expense_groups_admins_are_members` (`admin_ids <@
member_ids`, migration 003) keeps inside `member_ids`; the roles are labels the
app uses to derive `admin_ids` (`computeAdminIds`) on each membership patch.

### Decision

Both sides, so neither trusts the other.

- **Database, migration `20260928000016_group_member_role_check.sql`.** A CHECK
  constraint `expense_groups_member_roles_valid` calls
  `public.group_members_roles_valid(jsonb)`: `members` is an array and every entry
  is an object whose `role` is a JSON string equal to one of the four roles (a
  missing, null, numeric or array role, a case or whitespace variant and a
  non-object entry are refused; SQLSTATE `23514`). A constraint, not a trigger:
  the value lives in jsonb but a CHECK can call an immutable function, it
  validates existing rows and it holds for every writer, the service role
  included. Rollout: normalise first (an object entry with a bad or missing role
  becomes `'member'`), add `NOT VALID`, then `VALIDATE`. The helper reads no
  table; it is executable by `authenticated` and `service_role` (constraints run
  with the writer's privileges) and never by `anon` or `PUBLIC`. Full
  `migrate:down` (constraint and helper; the normalisation is a data fix and is
  not reversed). Proven in `src/tests/rls/member-roles.test.ts` (each valid role,
  every rejection shape on insert and update, the service role, the catalog,
  the normalisation and the down/up round trip in rolled-back transactions);
  `npm run test:rls:mutation` drops the constraint and neuters the helper.
- **App.** `ExpenseGroupMemberSchema.role` is `AppRoleSchema.catch('member')`:
  an unknown, missing or non-string role reads as `'member'`, the lowest role, so
  the page renders and the member is shown as a plain member. Deny by default:
  `computeAdminIds` stays an allowlist (`hasMinimumRole`), so an unknown role can
  never produce an admin, and admin checks read `adminIds`. `AppRoleSchema`
  itself stays strict. A membership patch that writes the parsed members back
  therefore also repairs a legacy label.
- **Fixtures.** `groupRow` writes `'member'`, not `'user'`.

### Alternatives considered

- **A validating trigger.** Needed only if the rule had to see OLD and NEW; it
  does not, and a trigger does not validate rows already stored.
- **Tying `role` to `admin_ids` in the same constraint** (a member is labelled
  owner/admin iff they are in `admin_ids`). The invariant exists only in the app;
  the suite writes `admin_ids` without touching `members[]`, and the guard trigger
  gates `admin_ids` changes, not label changes, so a two-way constraint would
  change what an admin may write. Left as an open question: any member may edit
  `members[]` (ordinary fields), so a member can relabel someone as `admin`; that
  changes a badge, never a permission, because nothing authorizes from the label. **Corrected and closed by the
  B19c amendment below:** `computeAdminIds` did carry the label into `admin_ids`; migration 017 and the app change fix it.
- **Failing the read (status quo).** One bad label blanks the group for everyone.

### Deploy note (owner action)

Migration 016 joins the owner's next `db-migrate.yml` run: `gh workflow run
db-migrate.yml --ref inceptor -f command=migrate`, then `npm run -s db:audit --
"$SUPABASE_DB_URL"` must equal the local dump (it now lists the constraint and the
function). Order does not matter for the app: the tolerant read ships in the same
build and works before and after the constraint. The migration rewrites any group
whose `members[]` holds an unknown role (none is expected: the app never wrote
one), and aborts, changing nothing, if an entry is not an object.

### Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| A group member with a legacy or corrupt role | Before: the whole group blanked for them and everyone else. After: the group opens and they read as a plain member; if the label was wrong, their badge changes to "member". | The label is the lowest role, so nothing is granted; `admin_ids`, which decides every permission, is untouched, so nobody gains or loses access. |
| The group admin | Cannot store an unknown role by any path (client, REST, `batch_write`). A membership patch that round-trips a legacy member fixes the label. | The constraint rejects with `23514` and names itself; the app never builds such a role (`AppRole` in TypeScript). |
| Every other member | Groups stop blanking because of one bad row. | Tolerant read plus the database check: the bad state cannot be re-created. |
| The owner running the deploy | A data rewrite and a constraint on a shared production table. | Normalise, `NOT VALID`, then `VALIDATE` (no long write lock), one transaction, a down path, a rolled-back-transaction test of both directions, and a failure that changes nothing. |
| Future contributors | A new role must be added in three places: `AppRoleSchema`, the `@cyber-eco/types` enum and the helper. | The RLS suite fails on a role the helper does not know, and the mutation check fails if the constraint is dropped. |

## Amendment (2026-09-29, plan B19c): stored admin labels agree with `admin_ids`

`risk:high`: a migration and a correction. The full reasoning, the alternatives and the
Stakeholder Analysis are in [ADR 0015](./0015-writes-require-a-connection.md), section 5; this
records the schema change where the schema is owned.

### Correction of the B19b amendment

B19b left this open: "any member may edit `members[]`, so a member can relabel someone as `admin`;
that changes a badge, never a permission, because nothing authorizes from the label." The second half
was wrong. `withAddedMembers` and `withRemovedMember` derived the next `admin_ids` from the stored
labels (`computeAdminIds`), so a member who labelled themselves `admin` became a real admin the next
time any admin added or removed a member. The guard trigger did not stop it: the acting admin is
allowed to change `admin_ids`, and the patch was theirs.

### Decision

- **App**: the displayed role is derived from `admin_ids` (Owner is `created_by` while still an
  admin, Admin is anyone in `admin_ids`, everyone else Member); membership patches start from the
  stored `admin_ids` and rewrite every label from it. `computeAdminIds` is for a brand-new group only.
- **Database**, migration `20260928000017_group_admin_labels_consistent.sql`: CHECK constraint
  `expense_groups_admin_labels_consistent` over the immutable, total helper
  `public.group_admin_labels_consistent(jsonb, text[])`: a member labelled `owner` or `admin` must be
  in `admin_ids` (SQLSTATE `23514`, every writer, the service role included). **One-way**: an
  `admin_ids` entry with a plain label is still valid (it is what the RLS suite and `batch_write`
  write, and the UI shows Admin for it); demoting changes both in one UPDATE. A `moderator` label needs
  nothing. Rollout in one transaction: demote any owner/admin label that has no `admin_ids` entry to
  `member` (never touching `admin_ids`, so nobody is really promoted or demoted), `NOT VALID`, then
  `VALIDATE`; full `migrate:down` (constraint and helper; 016 untouched; the demotion is not
  reversed). `AppRoleSchema` and the universal `ExpenseGroupMember` shape are unchanged.
- **Proof**: `src/tests/rls/admin-labels.test.ts`; `test:rls:mutation` drops the constraint and
  neuters the helper (both killed).

### Deploy note (owner action)

Migration 017 joins the owner's next `db-migrate.yml` run (`gh workflow run db-migrate.yml --ref
inceptor -f command=migrate`), then `npm run -s db:audit -- "$SUPABASE_DB_URL"` must equal the local
dump. Order does not matter for the app: the new patches never write a label the constraint refuses,
and the display derivation ignores the stored one.

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
