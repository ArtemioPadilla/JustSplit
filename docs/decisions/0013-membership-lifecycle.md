# 0013 — Membership lifecycle: visibility follows membership, edits check only what changed, email lookups are rate limited

## Status

`Accepted` — `risk:high`. Supersedes the schema-question amendments of
[0002](./0002-canonical-schema-and-rls.md) (B12),
[0005](./0005-supabase-storage-images.md) (B10 addendum) and
[0006](./0006-registered-participants.md) (rate-limit follow-up).

Date: 2026-09-28 (plan B2d; decided by the owner: "best engineering and best
UX")

## Context

Three earlier records each ended with an open question about the schema that
turned out to be the same one:

1. **ADR 0002, B12 amendment** — removing a member from a group made every old
   row that still named them uneditable forever (the `expenses_update` /
   `events_update` group branch required `member_ids ⊆ group.member_ids` on the
   *whole new row*); deleting a group ungrouped its rows into the no-group
   branch, which needs every member to be the acting admin's friend, so such a
   group could never be deleted; a `group_id` could dangle after a delete (rows
   the admin could not select were never ungrouped); and `batch_write`'s delete
   is a silent no-op when denied. The client answered with three preflights
   (member-removal blocker, friend preflight, read-then-ungroup batch).
2. **ADR 0005, B10 addendum** — `eventId` was an overflow key in `extra`, invisible
   to RLS: an event's expenses were visible only through `member_ids`, so two
   members of the same event saw different totals, and a non-friend event
   member could never edit an event expense. The client answered with a friend
   filter on `?event=`, a "N people aren't your friends" notice and an edit-block
   notice.
3. **ADR 0006** — `find_profile_by_email` had no rate limit: any signed-in user
   could enumerate candidate addresses with a script.

The common cause: `member_ids`-based RLS fixes *who may see and edit a row* at
write time, and the update rule re-validated people who were already on the
row. Group and event membership are live facts; rows must follow them.

## Decision

Five dbmate migrations (`db/migrations/`, each with a complete `-- migrate:down`),
applied in order, plus the app changes that delete the workarounds. Relational
mode via the SchemaMap throughout (never document mode; RLS is the only
authorization, `permissions: { enabled: false }`).

### A. `event_id` is a real column (`20260928000010_event_id_column.sql`)

`expenses.event_id text` and `settlements.event_id text` (settlements carried the
same `eventId` overflow key, and B14 reads `?event=`), nullable, with btree
indexes replacing the `extra->>'eventId'` expression indexes. Existing rows are
backfilled from `extra->>'eventId'` and the key is removed from `extra`
(idempotent statements, fenced by markers so the RLS suite re-runs them). The
SchemaMap lists `event_id`, so adapter `eventId ==` filters hit the column;
`batch_write` needed no change because it validates keys against
`information_schema.columns` (proved by `event-id.test.ts`). The Zod schemas read
`eventId` as `string | null | undefined`. `updated_at` is bumped on backfilled
rows, accepted for a one-time data move.

### B. Foreign keys, `ON DELETE SET NULL` (`…011_membership_foreign_keys.sql`)

`expenses.group_id`, `events.group_id`, `settlements.group_id` →
`expense_groups(id)`; `expenses.event_id`, `settlements.event_id` → `events(id)`.
**Existing data**: orphaned ids are nulled first (exactly what the action would
have done), then each constraint is added `NOT VALID` and `VALIDATE`d. Referential
actions run as the table owner and bypass RLS but still fire the BEFORE UPDATE
guards; the guards never reject a change that only nulls `group_id`/`event_id`.
Deleting a group or an event now ungroups/unlinks its rows atomically — with no
friendship check, no dangling id, including rows the deleting admin cannot see.
Group delete stays authorised by `expense_groups_delete` (admin); event delete by
`events_delete` (creator).

### C. Visibility follows membership (`…012_membership_visibility.sql`)

`SECURITY DEFINER`, `stable`, `search_path`-pinned helpers, revoked from
`public`/`anon`, granted to `authenticated` (policies run as that role), each
answering only about the caller: `is_group_member(gid)`, `is_event_member(eid)`,
`can_see_expense(id)`; and `can_see_shared_row(member_ids, group_id, event_id)`
(security invoker) — the one predicate. `expenses_select` and `settlements_select`
= caller ∈ `member_ids` OR group member OR event member. The four
`receipts_expenses_*` storage policies call `can_see_expense` instead of four copies
of a `member_ids` clause, so a receipt is exactly as visible as its expense.
`find_profiles_by_ids` resolves anyone named on a row the caller can see (else a
group member would see a former member as "Unknown"). Realtime needs no change: it
evaluates the select policy per subscriber (a Realtime case proves a group member
who is not in `member_ids` receives the change).

### D. Edits check only what changed (`…013_edit_checks_added_members.sql`)

`expenses_update` USING = the visibility predicate; WITH CHECK keeps only what needs
no OLD row (the actor still sees the row after the change, `paid_by` and every
split user ∈ `member_ids`). The membership rules move into
`guard_expenses` / `guard_events` (security invoker, under the actor's own RLS),
comparing `NEW.member_ids` with `OLD.member_ids`. Only **added** members are checked:

| Row | An added member must be |
|---|---|
| `group_id` set | a member of the group |
| else `event_id` set (expenses) | an event member **or** an accepted friend of the actor |
| else | an accepted friend of the actor |

`events_update` gets the same rule (group member, else accepted friend) and its
WITH CHECK is only "still a member". `expenses_insert`: group expenses unchanged;
an event expense without a group takes event members or the creator's friends, and
the creator must belong to the event. `created_by` stays immutable everywhere.
NULLing `group_id`/`event_id` is always allowed (the foreign keys do it).

Deviations from the brief, all in the direction of consistency or safety:

- An event expense's added members may also be **friends** on update, exactly as on
  insert (the brief allowed only event members on update; the asymmetry would let
  a form create a row it could not then edit).
- **Pointing a row at a different group/event** needs the actor to be *named on the
  row* (`old.member_ids`) as well as a member of the target, and a group target
  also needs `member_ids ⊆ group` (the B12 attach rule). Otherwise anyone who can
  merely *see* an expense (through an event) could re-point it into any group they
  belong to and expose it there.
- On insert, `event_id` requires the creator to be an event member: rows appear in
  every event member's feed now, so an outsider must not be able to push into it.

### E. `find_profile_by_email` rate limit (`…014_profile_lookup_rate_limit.sql`)

`public.profile_lookup_attempts(uid → auth.users on delete cascade, at)` indexed
on `(uid, at)`, RLS **enabled with no policy** and no grant to `anon`/`authenticated`:
unreadable and unwritable by clients. The definer function takes a per-caller
advisory lock, counts the caller's attempts in the last hour, raises SQLSTATE
`P0429` / `rate_limited` at the named constant `lookup_limit := 30`, otherwise
records the attempt and prunes that caller's rows older than a day. Every call
counts (found or not); a blocked call is *not* recorded, so the window slides
instead of extending; a call without a JWT (service role) is not limited. The
function is no longer `stable`. Client: `rpc()` maps the error to a typed
`LookupRateLimitedError`; `AddFriendForm` shows "You've looked up a lot of emails
recently. Please try again in a while." inline — no toast, no raw text, and the
limit is never stated.

### App changes (the workarounds this replaces)

- Hooks: `useExpenses` / `useSettlements` subscribe with **no** `memberIds` filter
  (`repos.*.visibleFilters()` is `[]`, `listVisible()` replaces `listForUser(uid)`);
  groups, events and friendships keep theirs (their membership *is* the array).
  The relational adapter, the memory adapter and Realtime already supported an
  empty filter list. Personal figures (dashboard totals, friend balances, group
  attach candidates) narrow client-side with `involvingUser(rows, uid)`; the expense
  list and the group/event feeds show everything the viewer may see.
- The memory adapter emulates the select policies (optional `viewer`, group/event
  membership looked up live) and `ON DELETE SET NULL`, so the repo and contract
  suites do not lie.
- B10 `ExpenseForm`: `?event=` offers every event member and writes `eventId`; the
  friend filter, the "N people aren't your friends" notice and the edit-block notice
  are gone. `violatesNoGroupInvariant` became `violatesAddedMembersRule` (the client
  mirror of the added-members guard), `resolveMemberIds` makes an edit never drop a
  member of a group expense.
- B12: `repos.groups.remove` is admin preflight → delete → re-read (no friendship
  preflight, no read-then-ungroup batch, `GroupDeleteBlockedByFriendshipError`
  deleted); `MembersSection` no longer blocks removing a member "still part of N
  expenses" (`memberRemovalBlockerCount` deleted; the last-admin guard stays).
- B9 `repos.expenses.remove` keeps its creator/payer preflight: the row delete policy
  is unchanged, and the storage delete policy is still wider than it.

## Alternatives considered

- **Junction tables (`group_members`, `event_members`) + `is_member()`** instead of
  `member_ids text[]`. Rejected again (ADR 0002): the denormalised array is what
  the whole SchemaMap/`array-contains` design rests on; the helpers give live
  membership for the two collections that need it without changing the shape.
- **Keep `member_ids`-only visibility and fix only the edit rule** (e.g. key it to
  `created_by` or to OLD `member_ids`). Leaves event totals viewer-dependent and a
  newly added member blind to history; rejected on UX.
- **A `SECURITY DEFINER` RPC that ungroups and deletes** (ADR 0002's rejected
  alternative). Unnecessary once foreign keys do the same atomically.
- **Enforce the added-members rule in the WITH CHECK** by subquerying OLD. A policy
  cannot see OLD; the BEFORE UPDATE guard is the only place, and it is where
  `created_by`/admin rules already live.
- **Rate limit at an edge proxy or with a client-side counter.** There is no server
  in this architecture and a client counter is not a control; the function is the
  only place a static client cannot skip.
- **Document mode (`public.documents`) for any of it.** Owner-only RLS would expose
  or hide every group row; forbidden by spec D10.

## Consequences

**Positive** — event totals are the same for every event member; joining a group
shows its feed; removing a member locks nothing; deleting a group works whatever the
admin's friendships and whichever rows they can see, in one statement; the client
lost three preflights and two notices; the friend-search enumeration is bounded.

**Negative** — anyone added to a group or event sees its whole history (intended,
recorded in the Stakeholder Analysis); any participant can still *un-group* a row
they are named on (nulling is allowed, the foreign key does it) and thereby hide it
from the group feed; Realtime does not signal a row that *becomes invisible* to a
subscriber (a group deleted, a member removed, an event deleted), so another
member's open tab keeps the stale row until its next fetch; an unfiltered
`select *` now returns a whole visible feed, so the PostgREST `max_rows = 1000`
cap can silently truncate a very busy account (pagination is a follow-up); an old app build writing `eventId` into `extra` after
the migration produces rows the column does not see until the idempotent backfill
is re-run; the rate limit does not stop an attacker with many accounts (sign-ups are
limited by Auth).

**Neutral** — five migrations touch `expenses`; `guard_expenses`/`guard_events` are
now the home of the membership rules; personal totals are scoped on the client, which
is UX, not authorization.

## Deploy note (owner action)

After this merges, run `gh workflow run db-migrate.yml --ref inceptor -f command=migrate`
against the real Supabase project, then `npm run -s db:audit -- "$SUPABASE_DB_URL"`
must equal the local dump (it now includes the foreign keys). Apply the migrations
**before or together with** deploying an app build that reads `event_id`; if a build
that still writes `eventId` into `extra` ran in between, re-run the backfill
statements between the `-- backfill:begin` / `-- backfill:end` markers of migration
`20260928000010` (idempotent).

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| Members of a group or event | They now see **every** expense and settlement of that group/event, including rows created before they joined, and rows that never name them. That is the intent (one shared ledger, identical totals), but it is a wider disclosure of past spending than `member_ids` gave. | Joining is controlled: only a group admin adds group members (each an accepted friend of the admin), and only an existing event member adds event members (each a group member or an accepted friend). Personal figures still count only rows that name the viewer. The disclosure is stated here and in the test names, not hidden. |
| A removed member | Keeps the history that names them (rows still list them in `member_ids`, so they stay readable, editable and their receipts reachable) and loses the group's feed and every row that never named them; they can no longer see the group itself. They can still edit or ungroup rows that name them. | Nothing they are part of is locked or lost; what they lose is exactly what they were only seeing as a member. Ungrouping is the accepted trade-off of allowing NULL. |
| A non-friend co-member | Can now see, create and edit event/group rows without being friends with everyone on them, and is no longer told "you can view this but not edit". They cannot be added to a row by someone who is neither their friend nor a co-member of the group/event, and cannot push rows into a feed they do not belong to. | The added-members guard, the creator-must-belong-to-the-event insert rule and the participant-must-be-named re-pointing rule; all proven in the RLS suite. |
| Someone whose email is looked up | Registered-vs-not remains inherently revealing to a signed-in user, but a script can now try at most 30 addresses per hour per account; their address is never revealed to the caller beyond that outcome. | The per-caller limit, no policy or grant on the counter table (clients cannot read or reset it), the fixed client sentence that never states the limit, and `auth.users` cascade so deleting an account removes its history. An attacker with many accounts is bounded by Auth's own sign-up limits. |
| The group admin | Deleting a group always works and never leaves half-ungrouped or dangling rows, even when they are not friends with a member or cannot see a row; removing a member can no longer lock rows. | Group delete stays admin-only (`expense_groups_delete`), the client still preflights admin and re-reads after the delete; the last-admin guard stays. |
| Future contributors | The membership rules live in two guard triggers and four helper functions instead of in policy text, and a policy can no longer be read on its own. New tables that reference groups/events must use the same foreign key and helper pattern. | The coverage guard fails CI on a table with RLS and no policy that is not on the closed list, on a helper reachable by `anon`, on a private `member_ids` clause in the expense/receipt policies, or on a `group_id`/`event_id` reference without `ON DELETE SET NULL`; `npm run test:rls:mutation` kills 44/44 mutations, including each helper and foreign key. |

## Supersedes

The "Open schema question", the member-removal preflight and the group-delete
friendship preflight of [0002](./0002-canonical-schema-and-rls.md)'s B12 amendment;
the event-visibility, non-friend-editing and edit-block parts of [0005](./0005-supabase-storage-images.md)'s
B10 addendum; the rate-limit follow-up of [0006](./0006-registered-participants.md).
The policy inventory of ADR 0002 is amended for `expenses`, `settlements` and
`events` as described above.

## References

- Spec D9, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2d: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `db/migrations/20260928000010`–`…014`; `src/tests/rls/{event-id,fk-lifecycle,visibility,realtime-visibility,membership-edit,lookup-rate-limit,coverage}.test.ts`;
  `scripts/rls-mutation-check.mjs`, `scripts/db-audit.sh`
- App: `src/domain/expenseParticipants.ts`, `src/domain/dashboard.ts` (`involvingUser`),
  `src/lib/data/repos/{expenses,settlements,groups,profiles}.ts`,
  `src/lib/data/client.ts` (`LookupRateLimitedError`), `src/tests/memory-adapter.ts`,
  `src/components/features/{expenses/ExpenseForm,groups/MembersSection,friends/AddFriendForm}.tsx`
- ADR 0002 (B12 amendment), ADR 0005 (B9, B10 amendments), ADR 0006, ADR 0011
- `cyber-eco/cybereco-hub`: `docs/design/permissions-rls-doctrine.md`,
  `docs/design/schema-map-strategy.md`
