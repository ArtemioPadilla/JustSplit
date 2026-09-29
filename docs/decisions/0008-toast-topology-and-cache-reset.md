# 0008 — Layout-level Toaster topology, and the local-cache-reset design

## Status

`Accepted`

Date: 2026-09-28 (plan B17b)

## Context

No `<Toaster/>` had ever been mounted anywhere in the tree before this
issue. `src/stores/notifications.ts` (plan B5b) already existed and was
already called from every island landed since B8b (`DashboardIsland`,
`ExpenseListIsland`, `ExpenseFormIsland`, `DeleteExpenseDialog`,
`RemoveFriendDialog`, `DeleteGroupDialog`, ...) — success, error, and
"Report an issue" toasts alike — but with nothing rendering Base UI's
`<Toast.Viewport>`, every one of those calls was silently invisible. This
issue closes that gap and decides two things: (1) where the single
`<Toaster/>` lives given Astro's islands architecture (each `client:*`
mount is its own independent React root — CLAUDE.md's compound-component
gotcha applies to more than just `<Dialog>`), and (2) the local-cache-reset
flow that replaces the legacy Firestore IndexedDB corruption-recovery UI,
which has no equivalent need on this stack.

## Decision

### Toast topology: one layout-level `<ToasterIsland client:idle/>`

Two `createRoot`s on one `document` (`src/components/ui/toast.test.tsx`)
modeled the real shape: root B mounts `<Toaster/>` (BaseLayout's role), root
A only ever calls the imperative `toast()` (any other island's role). This
passed — Base UI's `createToastManager()` (`ui/toast.tsx`'s `toastManager`)
is a plain module-level singleton object (`add`/`close`/`update`/`promise`
+ an internal `subscribe`), so every root that imports `ui/toast.tsx`
shares the same manager instance and gets notified. That result select the
topology: **one shared `<ToasterIsland client:idle/>` in `BaseLayout.astro`**,
not one `<Toaster/>` per route island. A per-route Toaster would work too
(the manager is process-wide either way) but would mean every route island
pays for `BaseToast.Provider`/`Viewport`'s own render cost redundantly, and
— worse — a route island mounted `client:only` (CLAUDE.md: "one route
island per page, `client:only='react'`") would need its OWN Toaster mounted
before it could show anything, re-introducing exactly the race this ADR's
second finding below is about.

**Two real gaps the same test exposed, both fixed here:**

1. **Pre-hydration toasts were silently dropped.**
   `createToastManager()`'s `add()` (Base UI source,
   `createToastManager.js`) just calls `emit()` to whatever listeners are
   subscribed *at that instant* — it holds no buffer. A toast fired before
   ANY `<Toaster/>` has mounted (a route island hydrating `client:only`,
   racing ahead of `BaseLayout`'s `client:idle` Toaster) would be lost with
   no error. Fixed with a small buffer in `ui/toast.tsx` itself:
   `toast()` pushes into a module-level `pendingToasts` array while no
   `<Toaster/>` has mounted; the first `<Toaster/>` mount flushes it in its
   own `useEffect`. Ordering is safe by construction — React fires child
   effects before parent effects on mount, and `BaseToast.Provider`'s own
   subscribe effect is a DESCENDANT of `Toaster`, so by the time `Toaster`'s
   flush effect runs, the manager already has a listener.
2. **The close button had no accessible name.** `BaseToast.Close` wrapped a
   bare `<XIcon/>` with nothing for a screen reader to announce. Fixed with
   `aria-label="Dismiss notification"`.

### Production build evidence (not just module identity in a test)

The unit-test singleton only proves module identity within one Vitest
worker; it says nothing about whether Vite's chunking duplicates
`ui/toast.tsx` across independently-hydrated island entries in the real
build. Verified directly against `npm run build`'s output (re-verified
after the "cross-navigation toasts" amendment below, which made
`notifications.ts` import `schemas/pending-toast.ts` — Rollup responded by
merging `ui/toast.tsx` and `stores/notifications.ts` into ONE chunk, since
every real importer already pulled in both; still exactly one chunk
either way):

```
$ grep -c "toastManager" dist/_astro/notifications.DNis1yM8.js
1   # our own module code; no other dist/_astro/*.js file mentions it at all

$ grep -l 'notifications\.DNis1yM8\.js' dist/_astro/*.js
AppRouterIsland.Bn9xqRxc.js    DashboardIsland.CMI4YZAm.js     ExpenseDetailView.DCbsAmJv.js
ExpenseEditView.Ds0fNFVd.js    ExpenseForm.BcslSLVS.js         ExpenseFormIsland.CAH4G8EW.js
ExpenseListIsland.CK1VT9kf.js  ExportCsvButton.DWo_kcge.js     FriendDetailView.tk86h5BD.js
FriendsIsland.DbndGiEh.js      GroupDetailView.D482VZ2_.js     GroupFormIsland.DcJNWPUQ.js
RemoveFriendDialog.Yj8Wfigs.js ShowcaseExportCsvButton.CBL8rEDL.js
ShowcaseResetLocalDataButton.CqSlOAAn.js  ToasterIsland.BV0nbJry.js
```

Sixteen separate built chunks — every island that (transitively) imports
`ui/toast.tsx` or `stores/notifications.ts` — all reference the *same*
`notifications.<hash>.js` chunk by its content hash. Vite's default
code-splitting already deduplicates a shared module into one chunk
referenced by every importer; nothing here needed a manual `manualChunks`
override. This is the real-build confirmation the plan asked for: the
singleton holds in production, not just inside one test file.

### Accessibility and timing

- `ToasterIsland` renders `<ErrorBoundary name="ToasterIsland"><Toaster/></ErrorBoundary>`,
  mounted with `client:idle` (never competes with first paint/interaction).
- Base UI's `Toast.Viewport` already sets `role="region"` +
  `aria-live="polite"` + `aria-label="Notifications"` — every toast is
  announced politely by default (unchanged here).
- `notifyError` (`stores/notifications.ts`) now passes `priority: 'high'`
  (Base UI announces it assertively — a hidden `role="alert"` mirror region,
  `esm/toast/viewport/ToastViewport.js`) and `timeout: 0` (disables the
  default 5s auto-dismiss entirely — WCAG 2.2.1, Timing Adjustable: an error
  the user didn't get to read before it vanished is effectively invisible).
  `notifySuccess`/`notifyInfo` keep Base UI's own 5000ms default, which
  already satisfies "no auto-dismiss faster than ~5s".
- `.bui-toast`'s transform/transition (the stacked-card slide/scale
  animation, `global.css`) is dropped entirely under
  `prefers-reduced-motion: reduce`, matching the file's existing pattern for
  `.shimmer`/`.ticker-track`.
- The destructive variant (`toastVariants({ variant: 'destructive' })`,
  already existed) is exercised and asserted in `toast.test.tsx` — no
  production change needed there, just confirmed working end to end.

### Local-cache reset: `resetLocalData()` ("Reset local data")

`src/lib/data/reset-local.ts` replaces the legacy Firestore IndexedDB
corruption-recovery flow. It runs six independent, isolated steps (each
wrapped in its own `try`/`catch` via a `runStep` helper, so ONE failing step
never skips the rest — idempotent and resilient by design):

1. Sign out via `stores/auth`'s `signOut()` — the same path every other
   sign-out UI uses (never a direct `@supabase/supabase-js` import outside
   `src/lib/data/`, CLAUDE.md rule 7). Already clears the idb
   `justsplit:query` persister key as its own side effect (ADR 0004); step 2
   is deliberately redundant/defensive rather than a bet that held.
2. idb-keyval: the shared `justsplit:query` key, Inceptor's own
   un-namespaced default `tanstack-query-cache` key, and every
   `justsplit:*` key `keys()` finds — three independent sub-steps.
3. `localStorage` keys under `justsplit:*`.
4. supabase-js's session storage (`sb-*` keys, its default prefix — no
   custom `storageKey` is configured in `lib/data/client.ts`), defensively.
5. Unregisters every service worker registration (`navigator.serviceWorker
   .getRegistrations()` → `unregister()`), guarded when unsupported.
6. Reloads to `withBase('/')` — unconditionally, whether or not every step
   above succeeded.

The result (`{ ok, failures }`) drives a single, honest toast:
`notifySuccess` only when every step succeeded, `notifyError` naming how
many steps failed otherwise — never a blanket "done" on a partial reset.

**Why no corruption detector is ported.** The legacy Firestore tree needed
one because its IndexedDB cache was load-bearing: a corrupt local cache
could make the app unusable until manually cleared. Here, the TanStack
Query cache populated by the idb-keyval persister is purely an
optimization for a warm navigation (ADR 0004) — `useLiveQuery`'s
FETCH-THEN-LISTEN subscription (ADR 0004 amendment) is the actual network
source for every collection and does not depend on the persister having
restored anything. A failed hydration (`QueryCacheRestoreError`,
`src/lib/queryClient.ts`) simply means the client starts with an empty
cache and fetches over the network like a cold visit — there is no
"stuck, unusable app" state a detector would need to catch. `attachPersister`
now catches the persister's restore-promise rejection (previously an
unhandled rejection with no caller-visible signal at all) and reports it
through an `onRestoreError` callback; `QueryProvider` turns that into a
recovery-action fallback (an `ErrorState` + `ResetLocalDataButton`) rendered
as a SIBLING of the route content, never an ancestor — the app keeps
fetching and rendering normally underneath the banner.

**Where it's exposed today.** `ResetLocalDataButton`
(`src/components/features/settings/`) is the reusable confirm-dialog
trigger (signs the user out, so it needs a confirm step — same
compound-component shape as `DeleteExpenseDialog`/`RemoveFriendDialog`).
Two real mount sites land in this issue: `QueryProvider`'s recovery-action
fallback, and `/showcase`. The profile-island button is explicitly B15's
job (plan text); this issue only exports the already-tested component so
B15 has nothing left to build but the mount.

## Consequences

**Positive** — every `notifications.ts` call site (B8b onward) that stays
on the same page is now actually visible to users, without touching a
single one of those call sites (the ones that navigate right after
notifying needed their own fix — see the "cross-navigation toasts"
amendment below); the pre-hydration queue means a fast `client:only` island firing a
toast before the layout Toaster hydrates is no longer a silent failure
mode; the persister-restore-failure path has a real, tested recovery
action instead of a permanently-inert `useLiveQuery` disabled-`queryFn`
(same class of bug the B8b `useLiveQuery` amendment to ADR 0004 already
fixed for live-query failures — this closes the equivalent gap on the
persister side).

**Negative** — `ui/toast.tsx` now carries a small amount of manual queueing
logic (module-level `pendingToasts`/`toasterMounted`) that Base UI itself
doesn't provide; a future Base UI version that adds its own buffering would
make this redundant (harmless, just unnecessary) rather than conflicting
with it. (The original draft of this ADR accepted a narrower, real risk
here — a notify-then-navigate toast not being visually read before the
page tears down — as an unfixed trade-off shared with
`DeleteExpenseDialog`/`RemoveFriendDialog`. The "cross-navigation toasts"
amendment below replaces that acceptance with an actual fix.)

**Neutral** — the pre-hydration queue only ever holds toasts fired before
the FIRST `<Toaster/>` mount of the page's lifetime (there is exactly one,
per this topology); nothing in this design needs it to survive an Astro
page navigation (each navigation is a fresh document in this MPA, spec D2).

### Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | Errors (including "Report an issue" prompts) were completely invisible before this issue — a failed save looked identical to a successful one. | `ToasterIsland` on every non-marketing page; the pre-hydration queue closes the remaining race; `notifyError`'s `timeout: 0` means an error can no longer disappear before it's read. |
| Screen-reader users | The close button had no accessible name; error toasts were announced no differently from a success toast. | `aria-label="Dismiss notification"`; `priority: 'high'` for errors (Base UI's assertive announcement path). |
| Users on a shared/borrowed device | `resetLocalData()` signs the user out and wipes cached data — a genuinely destructive action if triggered by accident. | Confirm dialog (`ResetLocalDataButton`) is the only way to reach it from the UI; no auto-trigger anywhere. |
| Users who hit a genuine persister failure | Previously an unhandled promise rejection with zero visible signal — the app would just silently start cold, indistinguishable from a normal fresh visit, with no path to a deliberate full reset if the cause was more persistent (e.g. IndexedDB quota exhausted by another site). | `QueryProvider`'s recovery banner names the failure and offers `ResetLocalDataButton` directly, without blocking the route content, which keeps fetching over the network underneath it. |

## Amendment (2026-09-28, plan B17b): cross-navigation toasts

### Context

This ADR's original text already named the risk in its "Negative"
consequences and in `resetLocalData`'s own design ("the same accepted
trade-off `DeleteExpenseDialog`/`RemoveFriendDialog` already make") but
stopped short of fixing it: **this is a static MPA (spec D2) — every
`window.location.assign`/`.replace`/`reload()` is a full page load, and it
discards any toast fired synchronously right before it**, because Base UI's
toast manager (and every React tree holding it) lives in the JS heap of the
document being torn down. Grepping the whole tree for
`location.assign`/`location.replace`/`reload(` found six real call sites
where a `notify*` call is immediately followed by one:

- `ExpenseForm` (B10): create success, create partial-failure ("Expense
  saved, but N receipt(s) couldn't be uploaded...", the exact honesty
  message this was designed to surface), edit success, edit
  partial-failure — four notify-then-navigate pairs in one file.
- `DeleteExpenseDialog` (B9): delete success.
- `GroupForm` (B12): create success.
- `DeleteGroupDialog` (B12): delete success.
- `resetLocalData` (this issue): its own result toast, success or
  "finished with errors".

`RemoveFriendDialog`/`FriendDetailView`'s remove flow (B13) was checked
and does **not** navigate at all — the friend list re-renders in place, so
its `notifySuccess('Friend removed')` was never at risk and needed no
change. `MembersSection` (B12, add/remove group members) is the same:
no navigation follows. `AuthGate`/`AuthCallbackIsland`/`LoginForm`/
`SignUpForm`/`ResetPasswordIsland`'s redirects were checked too — none of
them fire a toast before navigating (sign-in success just redirects;
`ResetPasswordIsland` uses inline `status` state, not a toast).

### Decision

**A cross-navigation toast handoff, in `notifications.ts` itself.**
`{ afterNavigation: true }` on `notifySuccess`/`notifyError`/`notifyInfo`
queues the toast in `sessionStorage` (`justsplit:pending-toasts`) instead
of firing it immediately. `ToasterIsland` drains that queue once, on
mount, firing each entry through the SAME internal `fireNow` path used for
a live toast — so a drained error still gets `priority: 'high'`/
`timeout: 0`, and a drained success still gets the plain 5s-default
treatment. Design choices, and why:

- **An option on the existing functions, not a new `notifyAfterNavigation`
  export.** Every call site already imports `notifySuccess`/`notifyError`;
  adding a boolean option is a one-line diff at each site instead of a
  rename, and keeps the assertive/persistence rules defined in exactly one
  place (`fireNow`) regardless of whether a call fires live or is drained.
- **`sessionStorage`, not `localStorage`.** It's per-tab and clears itself
  when the tab closes — a queued toast has no reason to survive longer than
  the navigation it's bridging, and no reason to leak into a different tab
  a user might have open. Only the toast's `kind`/`title`/`description`
  text is stored — nothing about WHO performed the action or WHAT record it
  touched.
- **A Zod schema (`src/schemas/pending-toast.ts`), not a bare
  `interface`.** `sessionStorage` is a storage boundary — CLAUDE.md rule
  8 — so a malformed entry (garbage JSON, a future/older schema version, a
  hand-edited devtools value) is dropped by `PendingToastQueueSchema.safeParse`
  instead of crashing `ToasterIsland`'s mount-time drain. Bounded to
  `MAX_PENDING_TOASTS = 5` (oldest dropped first) so a page that queues
  repeatedly before ever draining (in practice: never happens today, since
  every migrated site navigates once) can't grow the key unbounded.
- **Read-then-remove, synchronously, before firing anything.**
  `drainPendingToasts()` reads and clears `sessionStorage` in the same
  synchronous call, before firing a single toast. This makes it idempotent
  by construction: a second call — React StrictMode's dev-only double
  effect invocation, or (defensively) two `ToasterIsland`s mounted at
  once — finds nothing left, with no async gap either call could race into.
- **`drainPendingToasts()` is called from `ToasterIsland`'s OWN mount
  effect, an ANCESTOR of `<Toaster/>`.** React commits child effects before
  parent effects on mount, so `Toaster`'s own flush effect and
  `BaseToast.Provider`'s subscribe effect (both descendants) run first —
  the manager already has a listener by the time the drain fires. The
  earlier pre-hydration queue inside `ui/toast.tsx` (this ADR's original
  section) is still there as a second, independent safety net regardless.
- **Fallback to firing immediately if `sessionStorage` is unavailable**
  (private-browsing storage limits, quota exceeded). The write path is
  wrapped in `try`/`catch`; a failure to WRITE falls back to `fireNow`
  directly rather than silently dropping the toast — the read path
  (`readQueue`) fails closed instead (an empty queue), since there is
  nothing sensible to fall back to when DRAINING.
- **`resetLocalData`'s own result toast now queues too**, and specifically
  survives the reset it's reporting on: its `localStorage`-clearing step
  only ever touches `localStorage` (`clearLocalStorageByPrefix`), never
  `sessionStorage`, so the pending-toast queue is untouched by any of
  `resetLocalData`'s own steps regardless of order. Tested directly against
  the REAL `notifications.ts` (not mocked, unlike `reset-local.test.ts`'s
  unit-level checks) in `reset-local-toast-survival.test.ts`, so the
  assertion exercises the actual storage boundary rather than trusting
  that `localStorage` and `sessionStorage` staying separate is obviously
  true.
- **Marketing pages leave the queue in place.** A marketing page never
  mounts `ToasterIsland` (spec D3; `check-auth-bundle.mjs`'s zero-island
  rule), so it never drains anything — `sessionStorage` persists across
  same-tab navigations regardless of which page reads it, so a toast queued
  on a non-marketing page that happens to navigate THROUGH a marketing page
  (no real route in this app does that today) would simply wait for the
  next page that mounts `ToasterIsland`. This is a documented consequence,
  not a bug: there's no page in the app today where this path is exercised.

### Alternatives considered

- **A `beforeunload`/`pagehide` listener that flushes toasts into
  storage.** Rejected: every migrated call site already knows, at the exact
  moment it fires the toast, that it's about to navigate — there's no
  reason to defer that decision to a generic unload listener, which would
  also have to run on EVERY toast (even same-page ones) to know which
  toasts need saving, and unload listeners are notoriously unreliable
  timing-wise (the spec allows the browser to skip synchronous work in
  them).
- **Passing the toast as a query string/URL fragment on the navigated-to
  URL.** Rejected: every migrated call site navigates to a canonical
  resource URL (`/expenses/<id>`, `/groups/<id>`, `/groups/list`) that
  other code (bookmarks, `?group=`/`?event=` deep links, `useUrlParam`)
  already assigns meaning to; smuggling toast state through it risks a
  collision with an existing or future query param and litters shareable
  URLs with UI-only state.

### Consequences

**Positive** — the exact bug this amendment opens with (B10's
partial-failure receipt-upload honesty message, always lost) is fixed,
along with five other real, previously-silent-failure sites; the fix is
one shared mechanism (`{ afterNavigation: true }` + `drainPendingToasts()`)
rather than a bespoke workaround per call site.

**Negative** — every future notify-then-navigate call site must remember
to pass `{ afterNavigation: true }` — nothing enforces this at the type
level (a boolean option is easy to forget). No lint rule or test scans for
a `notify*` call immediately followed by a `location.*`/`reload(` call
across the whole tree; this ADR's six-site enumeration is a point-in-time
audit, not a standing guarantee.

**Neutral** — same-page toasts (the majority of call sites: form
validation errors, `RemoveFriendDialog`, `MembersSection`,
`AttachRowsPanel`, ...) are entirely unaffected — they never needed the
handoff and don't use it.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | The receipt-upload partial-failure message — telling someone their expense saved but a specific receipt didn't and they need to re-add it from Edit — was silently lost on every save. Five other success/result toasts were equally invisible. | All six sites migrated; `drainPendingToasts()` fires them on the very next page load, through the same assertive/persistent rules a live error gets. |
| Users on a shared/borrowed device | `resetLocalData()`'s OWN failure toast (naming that the reset was incomplete) is the most consequential one to lose — a user could believe their data was fully wiped when it wasn't. | Now queued and proven (by test) to survive the reset's own storage-clearing steps, landing on the very next page. |
| Future contributors | A new notify-then-navigate call site is easy to write without realizing the toast will be silently discarded — there's no error, just a toast nobody ever sees. | This ADR's decision section states the rule explicitly (`{ afterNavigation: true }` whenever a `notify*` call precedes a navigation) as the documented pattern; no automated enforcement exists yet (named as a residual risk above). |

## Amendment (2026-09-29, plan B19): the sign-out wipe never depends on a lazy chunk

### Context

B19 made the TanStack Query client (`@/lib/queryClient`: TanStack core, the
persister and idb-keyval, about 40 kB) lazy on `/auth/*`. Its first cut had
`signOut()` dynamically import that chunk *after* the Supabase sign-out had
already succeeded, in order to call `clearPersistedQueryCache()`. If that
chunk failed to load (a network drop, or deploy skew leaving a stale hashed
file), the sequence was:

- the session was gone;
- `signOut()` rejected;
- the signed-out user's persisted Query cache stayed on the device.

That is exactly the leak this ADR's cache reset exists to prevent. Centinela
caught it in review.

### Decision

The shared persister key and the wipe live in a tiny module,
`src/lib/query-cache-key.ts`, which imports only idb-keyval's `del` (about
0.6 kB). `signOut()` imports the wipe statically from there and never touches
the Query client chunk. `@/lib/queryClient` re-exports both names, so the key
has one source of truth.

`src/stores/auth.test.ts` makes any import of `@/lib/queryClient` throw and
asserts that `signOut()` still resolves and wipes the cache.
`query-cache-key.test.ts` pins the key and checks the re-export is the same
function.

### Consequences

- `/auth/*` carries idb-keyval statically, about +0.6 kB, which is inside the
  B19 budget.
- The wipe order is unchanged: the Supabase sign-out comes first, and the
  wipe runs only if it succeeds, so a failed sign-out keeps both the session
  and the cache.

### Stakeholder Analysis (new rows, this amendment)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| People on shared devices | A failed lazy-chunk load after sign-out would have left the previous user's cached groups, expenses and settlements readable on the device. | The wipe has no dependency on any lazy chunk (a static 0.6 kB import). It is pinned by a test that makes the Query client chunk unloadable. |
| Signed-in users on flaky networks | `signOut()` could have rejected after actually signing out, which is a confusing half-state. | The only remaining async steps are the Supabase call and an IndexedDB delete. Neither needs a network fetch of app code. |

## Supersedes

None.

## References

- Plan B17b: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `src/components/ui/toast.tsx`, `src/components/ui/toast.test.tsx`
- `src/components/islands/ToasterIsland.tsx`, `src/layouts/BaseLayout.astro`
- `src/stores/notifications.ts`, `src/stores/notifications.test.ts`
- `src/schemas/pending-toast.ts` + `.test.ts` (the amendment's
  storage-boundary schema)
- `src/lib/data/reset-local.ts`, `src/lib/data/reset-local.test.ts`,
  `src/lib/data/reset-local-toast-survival.test.ts` (the amendment's
  real-`notifications.ts` survival test)
- `src/lib/queryClient.ts` (`QueryCacheRestoreError`, `attachPersister`'s
  `onRestoreError`), `src/lib/queryClient.test.ts`
- `src/components/islands/QueryProvider.tsx`, `QueryProvider.test.tsx`
- The amendment's six migrated call sites:
  `src/components/features/expenses/ExpenseForm.tsx` (+ `.test.tsx`),
  `src/components/features/expenses/DeleteExpenseDialog.tsx` (+ `.test.tsx`),
  `src/components/features/groups/GroupForm.tsx` (+ `.test.tsx`),
  `src/components/features/groups/DeleteGroupDialog.tsx` (+ `.test.tsx`),
  `src/lib/data/reset-local.ts`
- `src/components/features/settings/ResetLocalDataButton.tsx` +
  `.test.tsx`, `src/components/islands/ShowcaseResetLocalDataButton.tsx`
- ADR 0004 (TanStack Query over StorageAdapter, incl. the `signOut()` ⇒
  `clearPersistedQueryCache()` precedent this issue's step 1 is deliberately
  redundant with)
