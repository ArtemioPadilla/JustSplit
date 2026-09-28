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
build. Verified directly against `npm run build`'s output:

```
$ grep -c "toastManager" dist/_astro/toast.D_g-1sJE.js
2   # our own module code; no other dist/_astro/*.js file mentions it at all

$ grep -l 'toast\.D_g-1sJE\.js' dist/_astro/*.js
AppRouterIsland.COw_rjrC.js   DashboardIsland.BMeDcYFb.js   ExpenseDetailView.o6tZYqJu.js
ExpenseEditView.CdMA06EU.js   ExpenseFormIsland.PCYfKYMj.js  ExpenseListIsland.B-57gOUC.js
FriendDetailView.B2C6R7Sx.js  FriendsIsland.IFJhJB3N.js      GroupDetailView.VAQSrEr3.js
GroupFormIsland.DJXC-mRT.js   ShowcaseExportCsvButton.DWZhGz6A.js
ToasterIsland.BsJnInjL.js     notifications.DxOKmm1r.js
```

Thirteen separate built chunks — every island that (transitively) imports
`ui/toast.tsx` or `stores/notifications.ts` — all reference the *same*
`toast.D_g-1sJE.js` chunk by its content hash. Vite's default code-splitting
already deduplicates a shared module into one chunk referenced by every
importer; nothing here needed a manual `manualChunks` override. This is the
real-build confirmation the plan asked for: the singleton holds in
production, not just inside one test file.

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

### Local-cache reset: `resetLocalData()` ("Restablecer datos locales")

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

**Positive** — every `notifications.ts` call site (B8b onward) is now
actually visible to users, without touching a single one of those call
sites; the pre-hydration queue means a fast `client:only` island firing a
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
with it. `resetLocalData()`'s reload happens unconditionally even on
partial failure, which means the `notifyError`/`notifySuccess` toast has a
narrow, real risk of not being visually read before the page navigates away
— the same accepted trade-off `DeleteExpenseDialog`/`RemoveFriendDialog`
already make (`notifySuccess` immediately followed by
`window.location.assign`); not new to this issue, but worth naming since
`resetLocalData()`'s failure toast is the more consequential one to miss.

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

## Supersedes

None.

## References

- Plan B17b: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `src/components/ui/toast.tsx`, `src/components/ui/toast.test.tsx`
- `src/components/islands/ToasterIsland.tsx`, `src/layouts/BaseLayout.astro`
- `src/stores/notifications.ts`, `src/stores/notifications.test.ts`
- `src/lib/data/reset-local.ts`, `src/lib/data/reset-local.test.ts`
- `src/lib/queryClient.ts` (`QueryCacheRestoreError`, `attachPersister`'s
  `onRestoreError`), `src/lib/queryClient.test.ts`
- `src/components/islands/QueryProvider.tsx`, `QueryProvider.test.tsx`
- `src/components/features/settings/ResetLocalDataButton.tsx` +
  `.test.tsx`, `src/components/islands/ShowcaseResetLocalDataButton.tsx`
- ADR 0004 (TanStack Query over StorageAdapter, incl. the `signOut()` ⇒
  `clearPersistedQueryCache()` precedent this issue's step 1 is deliberately
  redundant with)
