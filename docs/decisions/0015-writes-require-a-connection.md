# 0015 — Writes require a connection: disabled, explained, never queued

## Status

`Accepted` — `risk:high`. Includes migration 017 (stored admin labels agree with `admin_ids`).
Implements the offline rule that spec §3 (D3 "Offline"), §5 (risks), §6 (feature-parity checklist)
and [ADR 0004](./0004-tanstack-query-over-storage-adapter.md) ("no offline writes in v1") state as an
intention; nothing in them changes. Amends [ADR 0002](./0002-canonical-schema-and-rls.md) (see its
B19c amendment: the B19b claim that a role label "never" reaches a permission was wrong, and is
corrected and closed here).

Date: 2026-09-29 (plan B19c; decided by the owner: "best engineering and best UX")

## Context

Offline, only `OfflineBanner` read `$online`. Every write control stayed live: a person on a train
could press Save, Delete, Record payment or Add friend and then wait for a network error, or get a
**half-applied multi-step write**. The app has several of those, each a sequence of separate
requests:

- expense create: row, then each receipt upload, then an `images` patch; edit: row patch, then
  receipts; whole-expense delete: receipts, then the row;
- avatar: upload, then the profile update, then removal of the old object;
- group attach: a batch, then a verifying re-read of each row.

A network error in the middle of one of those leaves data the person never asked for (a row with no
receipts, an orphaned object). The repo layer had no way to say "I will not even start".

Reviewing the code for this issue found two more things, both on the same path:

1. **TanStack Query's default `networkMode: 'online'` is an offline write queue.** A mutation started
   while its `onlineManager` says offline is **paused**: `mutationFn` is never called, and it is
   **resumed automatically when the connection returns**. So a guard inside `mutationFn` (the
   natural place for "refuse offline") would never run, and a save the person believed had failed
   could be replayed later, possibly after they left the page (the `QueryClient` outlives the
   component), under whatever session is current. That is exactly what ADR 0004 promised never to
   do ("never a queued mutation that could silently apply later under the wrong session"); until
   this issue it was true only by luck.
2. **The role label reaches a permission.** `expense_groups.members[].role` is a jsonb value any
   member can edit (`expense_groups_update` is member-wide and `guard_expense_groups` gates only
   `member_ids`, `admin_ids` and `created_by`). B19b called it "a badge, never a permission"
   because RLS reads `admin_ids`. But `withAddedMembers` / `withRemovedMember` derived the next
   `admin_ids` from those labels (`computeAdminIds`), so **a member who labelled themselves
   `admin` became a real admin the next time any admin added or removed anyone**. Section 5 below.

## Decision

### 1. Writes are disabled while offline, and never queued

With no connection, every control that writes is blocked and says why. Nothing is stored for later.

**The alternative, a background-sync queue** (Workbox `BackgroundSyncPlugin`, or an outbox in
IndexedDB replayed on reconnect), was considered and rejected for now:

- *The person must never believe money was recorded when it was not.* A settlement is an attestation
  ("Marked as paid by Ana", ADR 0014): a queued one reads as recorded to its author and to nobody
  else, for an unbounded time.
- *A replay is a new decision under changed facts.* Meanwhile the row may have been deleted or edited
  by someone else, the friendship revoked, the actor removed from the group (RLS decides on replay,
  and its answer can differ), the session replaced. Each needs a conflict story and a UI for it.
- *Multi-step writes have no clean replay.* Receipts and rows would need an ordered, idempotent
  outbox with per-step status.
- *This is a static MPA.* Every save ends in a full page load; an in-memory queue dies with it, and
  a durable one has to survive sign-out and account switching (the Query cache is wiped on sign-out
  for exactly that reason).
- *A silent queue is the failure mode, not the feature.* It turns a visible, immediate "can't save"
  into an invisible later surprise.

Revisit only as its own issue, with an explicit outbox surface (what is waiting, per-write status,
cancel), conflict resolution, and a decision on sign-out. Until then the honest behaviour is: reads
work from the cache as before, writes wait for a connection.

### 2. One hook, one sentence, one state per page

- `src/lib/offline-write.ts` (no imports, so any bundle can carry it): `isOffline()` is true **only**
  when `navigator.onLine === false` (reliable: no network at all; `true` only means "some network"
  and never blocks); `OFFLINE_WRITE_MESSAGE` is the one sentence, *"You're offline. Changes can't be
  saved until you reconnect."*; `OfflineWriteError`; `assertOnline()`; `refuseIfOffline(event?)`;
  `writeErrorMessage(error, fallback)`.
- `useCanWrite()` (`src/lib/use-can-write.ts`) is `useClientPreference` over the window's own
  `online` / `offline` events, so it is hydration-safe (server and first render say "can write") and
  re-enables on reconnect with no reload. It does **not** depend on the `$online` store, which only
  tracks the connection while something (the banner) is subscribed; the banner and the controls agree
  because both follow the same browser events. It returns `{ canWrite, noticeId, blocked }`, where
  `blocked` is `{ 'aria-disabled': true, 'aria-describedby': noticeId }` while offline and
  `undefined` online, so `{...write.blocked}` is a no-op online.
- `<OfflineWriteNotice write={write} />` renders the sentence with that id, only while offline.
- **A page owns one state and shows one sentence** (friends, settlements, group detail, expense and
  event detail, profile, dashboard): the owner calls `useCanWrite()` once and passes the state down;
  each control is described by that one visible sentence. A component that can also stand alone
  (`useSharedWrite(pageWrite)`) reads the connection itself and shows its own sentence. A dialog that
  can already be open when the connection drops has its own state for its confirm button.

### 3. UX rules while offline

- **`aria-disabled`, never a bare `disabled`.** A `disabled` button leaves the tab order and hides the
  reason from a screen reader. The control stays focusable, is announced disabled, and is described
  by the visible sentence (`aria-describedby`). `buttonVariants` dims an `aria-disabled` control like
  a `disabled` one.
- **A live check refuses the action.** `aria-disabled` does not stop a click or Enter, so submit and
  confirm handlers call `refuseIfOffline()`, which reads the live connection (not the render's
  snapshot) and cancels the event.
- **Nothing typed is lost.** A blocked form is still mounted with its values; going back online
  re-enables it in place.
- **Dialog triggers stay closed.** A blocked `LazyDialog` stand-in neither opens nor **warms** its
  chunk: a dynamic `import()` that fails offline can be remembered as failed for the page's life.
- **Inline edits** (`Editable`) are `readOnly` with an `aria-disabled`, described Edit button.
- **The preferred-currency selector** (which writes the profile) becomes its read-only stand-in.
- **Reads are untouched**: cached lists, detail pages, balances, exports, navigation, refreshing
  exchange rates.
- **In-flight guard.** If the connection drops mid-submit the mutation fails on its own path and the
  surface shows its existing plain failure text (or the shared sentence when the data layer refused).
  No surface can claim success for a failed write.
- **Surfaces covered (each blocked, described, refused, re-enabled; one test file each):** expense
  form (save, remove receipt) and delete; event form and inline rename; group create, delete,
  members add/remove and attach; friend request, accept, reject, cancel, undo, remove; record
  payment and undo; profile save, preferred currency (profile and dashboard), photo, password
  (account settings and the recovery page); inline expense edits.
  `src/tests/offline-write-coverage.test.ts` scans the source so a write added later cannot skip the
  rule. Its scope was hardened after review. It scans every top-level function (declarations
  and `const f = …` arrow or function expressions) in every non-test module under
  `src/lib/data` (hooks excepted: they only call the guarded repos) and `src/stores`. Modules
  that implement the primitives or touch only this device are exempted by an explicit list
  with a reason per entry. The UI half derives the write hooks from `useMutation(` rather
  than a name pattern, so a new hook is covered automatically.

### 4. Defence in depth: the data layer refuses too

A control someone forgets is a half-applied write. So every write entry point starts with
`assertOnline()` and throws `OfflineWriteError` **before any read, upload or RPC**: the repos'
`create` / `update` / `remove` / `settle` / `request` / `attach*` / `createWithReceipts` /
`addReceipts` / `removeReceipt`, `storage.ts`'s uploads and removals, and `stores/auth.ts`'s
`updateProfile` / `updatePassword` / `updateDisplayProfile`. The static test fails if a function
that performs a write primitive does not start with it. Sign in/up/out, the reset-password email and
resetting local data are deliberately not writes and stay available: leaving, or signing in, must
never depend on this rule.

And `createQueryClient()` sets `mutations.networkMode: 'always'` (queries keep the default and pause
offline, serving the cache). Without it Decision §1 would be false: see Context 1. Pinned by
`queryClient.test.ts`.

This is UX and integrity only. **RLS remains the authority** (CLAUDE.md rule 8); the client never
decides who may write.

### 5. The displayed role comes from `admin_ids`; the database refuses inconsistent labels

- **Display.** `displayedRole(group, userId)` (`src/domain/groups.ts`): *Admin* if the id is in
  `admin_ids`, otherwise *Member*; the *Owner* is `created_by` (immutable, enforced by the guard
  trigger) **while that person is still an admin**, so a badge never claims a power the person does
  not have. The stored `members[].role` is ignored for display, including a stored `moderator`
  (nothing writes one). Owner is derived, not stored, so it needs no separate honesty rule.
- **Patches start from the authority.** `withAddedMembers` keeps `admin_ids` as it is;
  `withRemovedMember` removes the one id. Neither calls `computeAdminIds` on stored labels (it is now
  documented as "for a brand-new group only"). Both rewrite every stored label from `admin_ids`, so
  a forged label heals whenever an admin touches membership.
- **DB constraint: yes** (migration `20260928000017_group_admin_labels_consistent.sql`): a member
  labelled `owner` or `admin` must be in `admin_ids` (CHECK `expense_groups_admin_labels_consistent`
  over an immutable, total helper; SQLSTATE `23514`, every writer, service role included). Why display
  derivation alone is **not** enough: (a) the UI is one client of a database other CyberEco apps can
  share, and a forged label would still mislead them; (b) the forged value stays stored and a future
  code path that trusts it re-opens the escalation; (c) it costs one migration, one helper and one
  rule that the honest client already satisfies.
  - **One-way on purpose.** An `admin_ids` entry with a plain label is accepted: `admin_ids` is the
    authority and the UI shows Admin for it, and the RLS suite and `batch_write` promote by writing
    `admin_ids` alone (B19b's report noted exactly that). A two-way rule would change what an admin
    may write. Demoting therefore changes both in one UPDATE, which `withRemovedMember` does.
  - Rollout in one transaction: demote any owner/admin label without an `admin_ids` entry to
    `member` (it can only lose a label; `admin_ids` is never touched, so nobody is really promoted or
    demoted), add `NOT VALID`, `VALIDATE`. Full `migrate:down` (constraint and helper; 016 is left
    alone; the demotion is a data fix and is not reversed).
  - Proven in `src/tests/rls/admin-labels.test.ts` (insert and update, the forgery, promote and
    demote, malformed members still `23514`, catalog, grants, volatility, the down path and the
    rollout in rolled-back transactions); `test:rls:mutation` drops the constraint and neuters the
    helper.
- **Alternatives rejected:** a two-way constraint (above); a validating trigger (it does not validate
  stored rows, and no OLD/NEW is needed); removing the label (`ExpenseGroupMember.role` is part of the
  universal `@cyber-eco/types` shape); trusting display derivation only (above).

## Consequences

**Positive** — no write can be started offline, so none is half-applied; every surface says why in one
sentence, reachable by keyboard and screen reader; the connection returning re-enables everything
without a reload; the hidden TanStack queue is gone, so ADR 0004's promise is now true; a forged role
label can neither mislead nor be promoted, and cannot be stored.

**Negative** — a person who paid someone in person while offline cannot record it until they
reconnect (the sentence says so; the form keeps what they typed so they can come back to it). Firestore
had a persistent write queue, so this is a deliberate behavioural regression, already accepted in ADR
0004. `navigator.onLine === true` does not prove a route to Supabase ("lie-fi"): such a write is not
blocked and fails on its own path. Every write control now reads one more hook (about +1 kB gzip per
app page, inside the existing budgets, none raised). Migration 017 touches every group row whose label
was forged (a demotion of the label only).

**Neutral** — `OfflineBanner` and `$online` are unchanged; the banner says the state, the controls act
on it. Signing out offline is still allowed.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| Someone offline who wants to record something (paid in person, on a plane, on a bad train) | Cannot save until they reconnect; a payment recorded later shows a later date and is seen later by the other party. | One plain sentence next to the control; the form keeps everything typed and re-enables on reconnect; no partial write; reads keep working. Not hidden: this is the documented cost of never queuing. |
| Someone on a flaky connection (`onLine` true, no route) | Not blocked; the write fails on its own path. | The existing plain failure text on every surface (tested per surface: never a success), and the repo's multi-step ordering rules already make a partial receipt upload visible (ADR 0005). Ping-based detection is out of scope and recorded as an open question. |
| Screen-reader and keyboard users | A blocked control that vanished from the tab order, or one that silently did nothing, would leave them unable to learn why. | `aria-disabled` + `aria-describedby` on the visible sentence, still focusable; a refused activation does nothing further; one sentence per page, not per row; the banner announces the change politely. Not verified with a real screen reader (open question). |
| The payer / payee of a settlement | A settlement can no longer be recorded or undone offline; nothing is queued that could later attest a payment neither remembers. | Decision §1; the ledger stays exactly what the last successful writes made it. |
| The user of a shared or borrowed device | A queued write could apply later under a different session. | There is no queue: `networkMode: 'always'` removes the one TanStack was keeping; sign-out still wipes the persisted Query cache. |
| A group admin | An unwitting admin patch used to promote a member who had forged a label. | Patches start from `admin_ids`; labels are rewritten from it; the database refuses the forged label. |
| A plain group member | Can no longer label themselves or others owner/admin (23514); still may rename the group and edit other ordinary fields. | Intended: the label was never theirs to grant. |
| Other CyberEco apps sharing the database | Their writes of `members[]` are constrained too. | The rule is one-way and only concerns `owner`/`admin` labels; `admin_ids`-only writes are unaffected. |
| The owner running migrations | Migration 017 runs on the shared project (staging and production): it demotes forged labels, then validates. | One transaction, a data-only demotion that never promotes, full down; SETUP owner-actions row; the app is safe to deploy before or after it. |
| Future contributors | A new write path could skip the rule. | `assertOnline()` first in every data-layer writer, `useCanWrite()` in every write component, both enforced by a source scan, plus the per-surface suites. |

## Open questions

- Not checked with a real screen reader (announcement of the description on a focused blocked
  control, and of the sentence appearing). Plan B19d now pins the machine-checkable half in CI (a virtual
  screen reader speaks the blocked control as disabled with the sentence as its description; the live smoke
  asserts the banner announces going offline once per page and the per-control sentence is never a live
  region); what NVDA, VoiceOver and TalkBack then say stays B18's manual pass.
- A ping-based "actually reachable" signal for lie-fi was not built; `navigator.onLine` is the one
  signal, blocking only on `false`.
- A background-sync queue stays possible later, as its own issue with the requirements in §1.
- `Editable` cannot keep a half-typed edit when the connection drops mid-edit: the data layer refuses
  the commit, the text reverts and the sentence is shown (an assertive toast); the alternative (keeping
  the field open) needs a machine change upstream of the shadcn wrapper.

## Supersedes

None. Implements the offline intent of spec §3/§6/§7 and [ADR 0004](./0004-tanstack-query-over-storage-adapter.md).

## References

- Plan B19c (`docs/superpowers/plans/2026-09-18-inceptor-migration.md`)
- [ADR 0002](./0002-canonical-schema-and-rls.md) (B19b and B19c amendments), [ADR 0004](./0004-tanstack-query-over-storage-adapter.md),
  [ADR 0005](./0005-supabase-storage-images.md), [ADR 0008](./0008-toast-topology-and-cache-reset.md),
  [ADR 0014](./0014-settlements-ledger.md)
- TanStack Query, "Network Mode" (`online` pauses, `always` runs): <https://tanstack.com/query/latest/docs/framework/react/guides/network-mode>
- `src/lib/offline-write.ts`, `src/lib/use-can-write.ts`, `src/tests/offline-write-coverage.test.ts`,
  `src/tests/rls/admin-labels.test.ts`, `db/migrations/20260928000017_group_admin_labels_consistent.sql`
