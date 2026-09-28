# 0005 — Supabase Storage for receipt photos and avatars

## Status

`Accepted`

Date: 2026-09-28 (spec D10 "Images"; plan B5b)

## Context

The legacy Next tree stores receipt photos and avatars as base64 data-URLs
inside Firestore documents (`expenses.images[]`, `users.avatarUrl`) — no
Firebase Storage bucket was ever used. That is not carried over (ADR 0001,
spec D1: no existing data is worth migrating). The clean schema needs a real
choice for where an uploaded receipt photo or avatar lives, and the answer
has to satisfy the same constraint as every other JustSplit collection: the
client is a static site with no server (ADR 0011), so Postgres/Storage RLS
is the only authorization available (ADR 0002).

Two options:

1. **Base64 in the row's `extra` overflow column** (zero backend surface —
   no bucket, no storage policies, no signed URLs). Rejected: a receipt
   photo is tens to hundreds of KB; base64 inflates that by ~33% and bloats
   every `expenses` row and every `select *`/Realtime payload with image
   bytes nobody asked for on a list page. It also has no independent
   lifecycle — deleting an object would mean rewriting the row's overflow
   key, and there is no equivalent of the RLS the `expenses` row already
   has for a "receipt url only, not the image bytes" read.
2. **Supabase Storage, a private bucket** (`receipts`), with the row storing
   only the object PATH (a short string) and `storage.objects` RLS policies
   mirroring the row's own membership rule. **Chosen** — this is the default
   spec D10 already describes.

## Decision

**Bucket:** `receipts`, private, 5 MiB limit, `image/*` only
(`db/migrations/20260928000007_receipts_storage.sql`, plan B2).

**Object paths**, both requiring a SECOND folder segment because
`storage.foldername(name)` needs one for the policies below to compare
against (a flat `avatars/{uid}.jpg` has none and is unconditionally denied):

- `expenses/{expenseId}/{uuid}.jpg` — every member of that expense
  (`uid = any(e.member_ids)`) may select/insert/update/delete. The expense
  row must exist BEFORE the first upload — the insert policy looks it up by
  id in `public.expenses`.
- `avatars/{uid}/{uuid}.jpg` — any signed-in user may `select` (avatars are
  shown next to names throughout the app); only the owner
  (`(storage.foldername(name))[2] = auth.uid()`) may insert/update/delete.

**`src/lib/data/storage.ts`** is the only new module (besides `client.ts`/
`relational-adapter.ts`) that touches `@supabase/supabase-js`
(`requireSupabase()`, never a raw import — CLAUDE.md rule 7,
`src/tests/data-boundary.test.ts`):

- `resizeImage(file, deps)`: client-side resize to <= 1600px longest side,
  re-encoded JPEG, quality stepped down until the blob is <= 1 MiB. Pure
  orchestration over injectable `createImageBitmap`/`createCanvas`
  parameters — jsdom/node implement neither — so it is unit-tested without a
  browser.
- `uploadReceipt(expenseId, file)` / `uploadAvatar(uid, file)`: resize then
  upload. `uploadAvatar`'s `uid` MUST be the caller's own id: rather than
  trusting a `uid` argument the UI could spoof (a stale prop, a query
  param), the function re-derives the true uid from the live session
  (`auth.getUser()`) and refuses a mismatch BEFORE reading or resizing the
  file. The RLS insert policy enforces the identical invariant server-side
  (`(storage.foldername(name))[2] = auth.uid()`); this is a fail-fast,
  friendlier-error client-side mirror of it, not a replacement for it.
- `removeReceipts(expenseId)`: lists then deletes every object under
  `expenses/{expenseId}/`. `repos.expenses.remove` calls this BEFORE the row
  delete (spec D10) — once the row is gone, no policy can reach the
  objects, so they would be orphaned unreachable forever. A listing or
  removal failure throws, which stops `repos.expenses.remove` from deleting
  the row: a retry can then still find both the row and its receipts,
  rather than deleting the row while a receipt lingers unreachable.
- `removeAvatar(path)`: deletes one object. Documented as safe to call only
  AFTER the profile update that stops pointing at it has succeeded — the
  order in the other direction would leave `profiles.avatarUrl` pointing at
  a deleted object if the profile write then failed.
- `signedUrl(path, expiresInSeconds)`: a small in-memory cache, keyed by
  path, whose entries expire 10% of the TTL early (capped at 60s) — never
  hands out a URL the storage server is about to reject.

**`<ReceiptImage path alt />`** (`src/components/features/ReceiptImage.tsx`)
resolves `path` through `signedUrl` and renders it, with an accessible
loading state and a fallback if the object cannot be resolved (RLS denial,
network error, a deleted object). Not added to `/showcase`: it needs a real
Storage object and an authenticated, member session to render anything
meaningful, so there is no backend-free way to demo it.

`Expense.images[]` and `profiles.avatarUrl` store the object PATH, never a
signed URL (URLs expire; paths don't) — islands resolve them at render time.

## Consequences

**Positive** — rows stay small (a path is a few dozen bytes vs. a
base64-inflated image); the object's own RLS mirrors the row's membership
rule exactly, so "who can see this expense" and "who can see its receipt"
never drift apart; deleting a receipt is an independent, retryable
operation instead of a partial-row rewrite.

**Negative** — an extra network round trip per rendered receipt (the signed
URL fetch, mitigated by the in-memory cache) instead of the data already
being inline with the row; `uploadReceipt` requires the expense row to exist
first, which constrains caller ordering (documented on the function, not
enforced by a type — a caller that gets it backwards sees the storage
policy's `insert` denial, not a client-side check).

**Neutral** — this repeats the "policy mirrors `member_ids`" pattern ADR
0002 already established for the tables themselves; nothing new about the
authorization model, just its extension to `storage.objects`.

## Supersedes

None.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users (privacy) | Receipt photos are sensitive personal data — a grocery or pharmacy receipt can reveal health conditions, purchases, or spending patterns to anyone who can see it. The bucket is PRIVATE and every object requires a signed request; nobody can view a receipt via a guessed or shared raw storage URL. | `storage.objects` policies restrict `select` to `uid = any(e.member_ids)` — exactly the members of that expense, never "anyone with the link." `signedUrl` tokens expire (default 1h) and are never persisted outside the in-memory cache (no `localStorage`/database column stores a signed URL). |
| End users (retention/erasure) | A user who leaves a group, or an expense that's deleted, should not leave behind a permanently-reachable receipt photo. | `repos.expenses.remove` deletes the storage objects BEFORE the row (this ADR); `src/tests/rls/storage.test.ts` proves that once the row is gone, no former member — including the one who uploaded it — can read or re-delete the object (a leaked object id is unusable, D10's own "leaked id" reasoning extended to Storage). A member who leaves a group does NOT retroactively lose access to older expenses' receipts (spec D9's `member_ids` denormalisation: a group membership change never rewrites older rows) — this is the same trust boundary ADR 0002 already documents for the row itself, not a new gap Storage introduces. |
| End users (avatars, a semi-public field) | Avatars are visible to any signed-in user (needed everywhere a name is shown), which is a narrower audience than "public" but wider than "expense members" — a user should understand their avatar is not private. | Only the `avatars/` prefix has this broader `select` policy; `expenses/` stays scoped to members only. The distinction is documented here and in the migration's own comments, so a future contributor extending Storage doesn't widen `expenses/` to match `avatars/` by copy-paste. |
| Maintainer | A signed-URL cache that fails to expire correctly could either leak a URL past its real validity (security) or serve a caller a URL the server has already invalidated (breakage). | The cache margin (10% of the TTL, capped at 60s) is tested with fake timers on both sides of the boundary — one test asserts a cache hit just before the margin, another asserts a forced refetch just after it (`src/lib/data/storage.test.ts`). |
| Maintainer / on-call | A partially-failed delete (objects removed, row delete fails; or the reverse) could either orphan unreachable storage bytes or leave a row with dead image references. | The order is fixed (objects, then row) and enforced by a test that fails the row delete when the storage call rejects (`src/lib/data/repos/expenses.remove.test.ts`) — a failure here surfaces as a normal thrown error the caller can retry, never a silent partial state. |

## Amendment (2026-09-28, plan B9): delete ordering preflight

### Context

Building the expenses detail island's delete flow (plan B9, tagged
`risk:high` because it touches `src/lib/data/repos/expenses.ts`) surfaced a
data-loss gap in `repos.expenses.remove` as originally shipped by this ADR:
it called `removeReceipts(id)` (deletes every object under
`expenses/{id}/`) BEFORE the row delete, in that fixed order, with no check
of who was calling. The two RLS policies guarding those two steps are
deliberately asymmetric:

- `storage.objects`'s `receipts_expenses_delete` (`db/migrations/20260928000007_receipts_storage.sql`)
  allows **any member** (`uid = any(e.member_ids)`) — intentionally wide,
  because plan B10 lets any member edit/replace a receipt photo on a shared
  expense, which needs the same breadth for `update`/`delete` as `insert`.
- `public.expenses`'s `expenses_delete` policy allows only the **creator or
  payer** (`db/migrations/20260928000004_rls_policies.sql`).

A member who is neither the creator nor the payer could therefore call
`remove()`, succeed at `removeReceipts(id)` (member-wide), and then have the
row delete silently denied by RLS (Postgres returns 0 rows affected, no
error) — every receipt permanently gone, the row still there with no way to
recover the images on a retry. This is exactly the kind of asymmetric,
two-step destructive operation this ADR's own "Consequences" section
already flagged in the abstract ("a partially-failed delete... could orphan
unreachable storage bytes or leave a row with dead image references") —
this amendment is the concrete instance the abstract worry predicted, plus
the fix.

### Decision

`remove(id)` fetches the fresh row via `get(id)` and checks the caller
BEFORE touching storage, throwing a typed error instead of running
`removeReceipts`:

- `id` resolves to no row → `ExpenseNotFoundError` (already deleted, or
  never existed — a stale detail-page open, a double-click).
- `(row.createdBy ?? '') !== uid && row.paidBy !== uid` → `ExpenseDeleteNotAllowedError`.

`uid` comes from `require-adapter.ts`'s new `requireUid()`, which reads the
`$user` session store (`src/stores/session.ts`) — never a function argument
a caller could pass incorrectly, the same identity-source rule CLAUDE.md's
auth-gating section already applies to `toGuardUser()`, extended to this
side of the data-layer boundary for the first time.

**This is a client-side safety preflight against a destructive PARTIAL
operation, explicitly NOT authorization** (CLAUDE.md rule 8, restated here
because it is easy to misread a permission-shaped `if` as one): the
`expenses_delete` RLS policy independently denies the row delete for a
non-creator/payer regardless of whether this check exists — a user who
bypassed the client entirely (a hand-crafted request) would still be denied
by Postgres, just after `removeReceipts` already ran, which is the exact bug
this closes. The storage policy stays member-wide; this amendment does not
touch it.

### Alternatives considered

- **Tighten `receipts_expenses_delete` to creator-or-payer, matching the
  row.** Rejected: B10 depends on any member being able to replace/delete a
  receipt image on a shared expense (e.g. re-uploading a clearer photo);
  narrowing the policy would break that feature for every member except the
  creator/payer, a much larger regression than the bug being fixed.
- **Delete the row first, then the receipts.** Rejected: once the row is
  gone, no `storage.objects` policy clause can match it (every one of them
  joins back to `public.expenses` by id), so a storage failure after a
  successful row delete would orphan the objects unreachable forever —
  trading one class of data loss (receipts survive a denied row delete) for
  a strictly worse one (receipts become permanently unreachable garbage,
  with the row already gone so there's nothing left to retry against).
- **A `SECURITY DEFINER` RPC that deletes both atomically, gated on
  creator-or-payer inside the function body.** The structurally cleanest
  fix (single transaction, no ordering question at all) but a new migration
  and a new class of privileged function this codebase doesn't have yet for
  writes (`db/migrations`' existing `SECURITY DEFINER` functions are narrow
  lookups — `find_profile_by_email` etc. — not mutations). Deferred: the
  client-side preflight closes the actual data-loss window today without
  new backend surface; revisit if a similar two-policy-asymmetry bug shows
  up elsewhere and a shared RPC pattern becomes worth the migration cost.

### Consequences

**Positive** — the data-loss window is closed for every future caller of
`repos.expenses.remove` (the B9 detail island's delete-with-confirm, and
any future caller), not just the one that happened to trigger this write-up;
the fix required no migration, no policy change, and no change to B10's
member-wide image editing.

**Negative** — `remove()` now makes one extra read (`get(id)`) before the
first write, on every call, even for the common creator/payer case that was
already going to succeed. Accepted: a single indexed point read against one
call graders throughput.

**Neutral** — the row-delete-only RLS suite (`src/tests/rls/expenses.test.ts`,
"a member who is neither creator nor payer... cannot") already proved the
server-side half of this before this amendment; what was missing was the
client-side ordering that let a doomed row delete run AFTER an unrecoverable
storage delete. This amendment adds no new RLS policy or RLS test for the
row side — the coverage already existed and is unchanged.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| A member who is neither the expense's creator nor its payer | Before this fix, opening the delete flow on a shared expense they don't own could silently destroy every receipt on it (permanent — no undo), while the row itself stayed behind looking untouched. | `remove()` now refuses before `removeReceipts` ever runs; the UI (plan B9's `ExpenseDetailView`) additionally only shows the Delete button to the creator/payer at all, though that's UX only — this ADR's fix is what actually stops the destructive call. |
| The creator or payer | No behavior change for the case that was always supposed to work — one extra read before the same two writes, in the same order. | Covered by `src/lib/data/repos/expenses.remove.test.ts`'s "the payer (not the creator) may also delete, in the same order" case. |
| Future contributors | The next person adding a delete flow over two asymmetric RLS policies (a shared object plus a narrower-owned row) has no prior written precedent for the "fetch and check before the first destructive call" pattern, or for where the identity it checks against should come from. | This amendment documents both: the pattern (fetch fresh, check first) and the identity source (`requireUid()` / `$user`, never a prop) — the next repo needing the same shape has a citation instead of a fresh design decision. |

## Amendment (2026-09-28, plan B10): create/edit write ordering

### Context

Plan B10 (risk:high up front — this issue writes expenses and uploads
receipt objects through `src/lib/data/`) builds the expense form
(`/expenses/new`, `/expenses/edit/<id>`), the first caller of this ADR's
storage helpers on the WRITE side beyond `remove()`'s delete path (B9's
amendment, above). The same "the expense row must exist before the first
upload" constraint this ADR already documents (`uploadReceipt`'s own doc
comment: `receipts_expenses_insert` looks the row up by id) now has to be
satisfied by a real create flow, not just asserted in a comment — and a
second, previously undecided question appears for the first time: what
happens when a create or a receipt-removal only PARTIALLY succeeds.

### Decision

**Create ordering — insert, then upload, then patch, in that fixed order,
never re-ordered:**

1. **Insert the row** with a client-generated id (`repos.expenses.generateId()`,
   a thin wrapper over `adapter.generateId('expenses')`) and `images: []`.
   The D10 insert policy on `public.expenses` is satisfied by the row
   alone — images are not gated on it — so this step never needs a file to
   have uploaded first.
2. **Upload each file** under `expenses/{id}/{uuid}.jpg` via the existing
   `uploadReceipt` (unchanged by this amendment). The row from step 1 now
   satisfies `receipts_expenses_insert`'s lookup.
3. **`updateDocument(id, { images })`** — a partial patch (D9's overflow-
   merge contract), never a second full-row write.

All three steps live in ONE place, `repos/expenses.ts#createWithReceipts`
(plan B10), so no caller can accidentally reorder them. `addReceipts`
(the edit flow) is steps 2–3 only — the row already exists.

**Idempotent retry via the client-generated id.** The id is generated
ONCE per form session (`ExpenseForm`'s own `useMemo`, reused across a
resubmit) and `createWithReceipts` treats it as a de-duplication key: if
`get(id)` already resolves (a prior attempt's insert succeeded), step 1 is
skipped entirely and its `images` become the retry's starting point —
never reset back to `[]`. Because the insert is a `setDocument` (upsert),
even a genuine double submit (two overlapping calls with the same id)
converges on one row, never two.

**Partial failure is reported, never hidden.** A single file's upload
failure is caught and skipped inside `createWithReceipts`/`addReceipts`
(not thrown) — `images` only ever contains paths that truly uploaded, and
`failedUploadCount` tells the caller how many were dropped. `ExpenseForm`
turns that into an honest toast ("Expense saved, but N receipt(s)
couldn't be uploaded. You can add it again from Edit.") and still
navigates to the detail page — the row and whatever DID upload are real
and worth keeping; only the insert step itself failing (a genuine
create-time error) shows a generic failure toast and leaves the form's
values intact, unsaved.

**Receipt removal (edit) — patch `images` BEFORE deleting the object,**
the opposite order from `remove()`'s whole-expense delete (B9's
amendment, above). `repos.expenses.removeReceipt(id, path)`:

1. `update(id, { images: images.filter(p => p !== path) })`.
2. `removeReceiptObject(path)` (a new, correctly-named sibling of
   `removeAvatar` — same single-path Storage `remove()` underneath).

This is the mirror image of `remove()`'s ordering, and deliberately so:
`remove()`'s risk is an AUTHORIZATION asymmetry (the row's
`expenses_delete` policy is narrower than the storage policy), so it
must check before touching storage at all. `removeReceipt`'s risk is
different — `receipts_expenses_delete` and `expenses_update` are both
member-wide, so there is no authorization gap to preflight — the risk is
an ORDINARY failure (network, transient storage error) landing between
two steps. Patching first means that failure mode leaves only an
UNREFERENCED object sitting in storage (recoverable: a future cleanup
job, or simply ignorable dead weight) — never a dangling reference in
`images` pointing at an object that's already gone, which would break
`ReceiptGallery`/`ReceiptImage` for the rest of that expense's life.

### Alternatives considered

- **Collect files in local state and send them alongside the create
  payload in one call** (today's legacy Next form's own shape). Rejected
  outright by this ADR's original text already: the storage insert
  policy requires the row to exist first, so a single combined call is
  simply not possible against the real RLS policies — this was already
  decided, not re-litigated here.
- **A server-generated id, form defers upload until after create resolves.**
  Rejected: without a caller-known id ahead of time, a retry after a
  partial failure would either need to re-fetch "did my last attempt's
  insert land" by some other signal (e.g. querying by description+amount+
  createdBy, unreliable and racy) or accept a duplicate row on retry. The
  client-generated id sidesteps the whole question — retry just reuses it.
- **Delete the object before patching `images` on removal** (matching
  `remove()`'s literal order). Rejected for the reason in the Decision
  section above: unlike `remove()`, there is no authorization asymmetry
  to preflight here, so the ordinary-failure trade-off dominates, and an
  unreferenced object is a strictly smaller problem than a broken image
  reference on a row that otherwise looks fine.

### Consequences

**Positive** — the ordering lives in exactly one place per direction
(`createWithReceipts`/`addReceipts` for writes, `removeReceipt` for the
one removal path), so no future caller can get it backwards the way a
scattered inline implementation would risk; a retry after any partial
failure is safe by construction (same id, upsert semantics) rather than
by caller discipline; a partial upload failure is always visible to the
user in specific, honest language, never silently dropped.

**Negative** — `createWithReceipts` makes one extra read (`get(id)`)
before deciding whether to insert, on every call, mirroring the same
accepted cost the B9 amendment already took for `remove()`'s preflight.
A receipt removal that fails after the patch leaves a genuinely orphaned
object in storage with no automated cleanup yet (Track D nice-to-have,
not scoped here) — accepted because the alternative (delete-first) risks
the strictly worse outcome of a broken image reference.

**Neutral** — this amendment adds no new RLS policy and no new migration;
every policy it relies on (`receipts_expenses_insert`/`_update`/`_delete`,
`expenses_update`) already existed from plan B2/B5b.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The user creating the expense | A flaky connection mid-upload could previously have meant "did my expense even save?" uncertainty, or (worse, if ever implemented backwards) a lost row. | The row always saves first and independently of uploads; a partial upload failure is reported by exact count, in place, with a concrete next step ("add it again from Edit") — never a silent partial success dressed up as a full one. |
| Other members of a shared expense | Any member can edit a shared expense (RLS: `expenses_update` = member) and add/remove its receipts (storage policies are member-wide by design, B10 relies on this — same as B9's amendment already noted). A removal failing between its two steps must not corrupt what every OTHER member sees. | `removeReceipt`'s patch-first order means the WORST case after a failure is a harmless orphaned object nobody's `images` points at — every member's gallery stays internally consistent (no broken thumbnails) even when a removal only half-completes. |
| Orphaned objects / storage cost | Patch-before-delete accepts that a receipt removal can, on a genuine failure, leave one object in the `receipts` bucket with nothing referencing it — a real, if small, storage-cost and "silent garbage" concern over the product's lifetime. | Bounded in practice: it only happens on a removal-time failure (not the common path), the object is inert (unreachable except by the same member re-triggering cleanup), and it costs a few hundred KB at most (client-side resize already caps receipts at ≤ 1 MiB, ADR 0005 base text). Automated sweeping is an explicit Track D nice-to-have, not this issue's scope — recorded here so it isn't rediscovered as a surprise. |

### Addendum (2026-09-28, plan B10 coordinator review): event participant resolution, the edit gap, and a known limitation

#### Context

`eventId` is a JustSplit-only overflow key with no column (spec D9) — the
`expenses_insert`/`expenses_update` RLS policies
(`db/migrations/20260928000004_rls_policies.sql`) know nothing about event
membership at all. They only ever check one of two things, and the WITH
CHECK is identical for insert and update except that update evaluates it
against the **editor**, not the creator:

- `group_id is not null`: `member_ids` must be a subset of the group's own
  `member_ids`, and the caller must be a member of that group.
- `group_id is null`: every member OTHER than the caller must be an
  **accepted friend of the caller**.

The form's first pass offered every one of an event's `memberIds` as a
participant candidate, with no regard for either branch — a save was
silently doomed whenever an event member wasn't the creator's (or, on
edit, the editor's) accepted friend.

#### Decision

**`?event=` participant resolution** (`domain/expenseParticipants.ts#resolveEventParticipants`),
in `src/schemas/event.ts`'s own field name, `Event.groupId`:

- **Event has a `groupId`**: treated as a group expense, the identical rule
  `?group=` already gets — `groupId = event.groupId`; candidates are the
  event's members intersected with the group's members (falling back to
  the whole group when that intersection is empty, e.g. the event's own
  member list hasn't caught up with the group's yet); `memberIds` on
  submit is the group's own `memberIds`, never a client-computed union.
- **Event has no `groupId`**: candidates are the event's members
  intersected with (accepted friends ∪ self). If any event members were
  excluded, a count-only notice shows ("N people in this event aren't in
  your friends yet, so they can't be added to this expense.") — a count,
  never names, so this never confirms or denies a specific person's
  friendship status to the caller. `memberIds` on submit is
  participants ∪ paidBy ∪ self, same as the plain "no context" default.

**Defensive invariant, every no-group submit** (create or edit):
`domain/expenseParticipants.ts#violatesNoGroupInvariant` mirrors the
`group_id is null` WITH CHECK directly and runs client-side before any
mutation call — if `memberIds` contains anyone who is neither the caller
nor an accepted friend of the caller, the submit is refused with a
generic inline message instead of sending a request RLS was always going
to deny. This catches stale client state the resolution logic above can't
prevent by construction alone — e.g. a friendship revoked (a live query
update) after a participant was already selected into form state, which
nothing else auto-prunes.

**Edit-mode notice for a no-group expense.** If the CURRENT editor isn't
an accepted friend of every other member already on a no-group expense,
`expenses_update` denies the save. `ExpenseForm` now checks this upfront
(derived from `useFriends`, the same `violatesNoGroupInvariant` check) and
disables Save with: "You can view this expense, but only someone who is
friends with everyone on it can edit it here." This is UX only — RLS
remains the sole authority either way — and is scoped to the edit form
only; B9's own inline `Editable` renames on the detail view are
unchanged and still surface a denied update as B9's existing generic
error toast, not this upfront notice. Group expenses are entirely
unaffected: any group member may edit one, matching the group RLS branch,
which has no friendship clause at all.

#### Known limitation — escalated, not fixed by this issue

Because `eventId` has no column and RLS cannot see it, a **no-group event
expense's visibility and editability are governed entirely by
`member_ids`/friendship, not by "belongs to this event"**:

- **Event-wide totals differ by viewer.** Two members of the same
  no-group event can see different total spend for it, because each
  expense's row is only visible to its own `member_ids` (D10's
  `member_ids`-based RLS), and an event's expenses can have different
  member subsets depending on who was friends with whom at the time each
  one was created. There is no query that reconstructs "every expense
  that belongs to event X," only "every expense I'm a member of that
  happens to carry this `eventId` overflow key."
- **A non-friend event member can never edit a no-group expense from
  that event**, even one they're a legitimate participant in spending
  terms, for as long as they and the editor aren't accepted friends —
  the UX notice above makes this visible and honest, but does not fix it.

**A real fix needs a schema/RLS change** — out of scope for this issue,
recorded here as a **follow-up decision** for whoever picks it up next:
an `event_id` column (instead of the current overflow key) with its own
event-membership-aware RLS clauses, analogous to the `group_id`/
`expense_groups` pattern; and/or an `expenses_update` WITH CHECK based on
`created_by` or on the row's OLD `member_ids` (a "the set of people who
could always see this expense never shrinks arbitrarily" invariant)
rather than solely the CURRENT editor's friendships. Neither is decided
here — this addendum only names the gap and its two candidate shapes so
Track D (or a dedicated follow-up issue) doesn't have to rediscover it.

#### Consequences

**Positive** — the create form can no longer construct a payload the RLS
policy was always going to reject for an event context; the edit form
tells an affected editor why Save is unavailable instead of letting them
discover it via a failed round trip; the defensive invariant closes the
same class of gap for stale client state generically, not just for the
event path that motivated it.

**Negative** — an event now needs up to two extra queries to resolve
fully (its own group, when it has one; the friends list, when it doesn't)
before defaults or an accurate candidate list can render — the same
"wait for it, don't guess" pattern every other async-resolved context in
this form already uses, extended by one more branch.

**Neutral** — no RLS policy or migration changes; every rule this
addendum encodes client-side already existed in
`db/migrations/20260928000004_rls_policies.sql` before this issue.

## References

- Spec D10 "Images": `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2 (migration), B5b, B9 (amendment), B10 (amendment):
  `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- ADR 0002 (canonical schema and RLS), ADR 0004 (TanStack Query over
  StorageAdapter), ADR 0011 (Supabase via the CyberEco data layer). Plan B10
  pulls the "registered participants only" rule forward from B13's own
  (not-yet-written) ADR `0006-registered-participants.md` — this file does
  not author that ADR; B13 still owns its full scope (email-based requests,
  the dropped directory search, etc.)
- `db/migrations/20260928000007_receipts_storage.sql`,
  `db/migrations/20260928000004_rls_policies.sql` (`expenses_delete`,
  `expenses_update`)
- `src/lib/data/storage.ts` (`removeReceiptObject`),
  `src/lib/data/repos/expenses.ts` (`generateId`, `createWithReceipts`,
  `addReceipts`, `removeReceipt`), `src/lib/data/require-adapter.ts`
  (`requireUid`), `src/components/features/ReceiptImage.tsx`,
  `src/components/features/expenses/ExpenseForm.tsx`
- `src/tests/rls/storage.test.ts` (`npm run test:rls`), `src/tests/storage.live.test.ts`
  (`npm run test:contract:live`), `src/lib/data/storage.test.ts`,
  `src/lib/data/repos/expenses.remove.test.ts`,
  `src/lib/data/repos/expenses.receipts.test.ts`
- Coordinator-review addendum: `db/migrations/20260928000004_rls_policies.sql`
  (`expenses_insert`/`expenses_update`, both branches), `src/schemas/event.ts`
  (`groupId`), `src/domain/expenseParticipants.ts`
  (`resolveEventParticipants`, `violatesNoGroupInvariant`) + `.test.ts`,
  `src/components/features/expenses/ExpenseForm.tsx` (`eventGroupQuery`,
  `editBlockedByFriendship`)
