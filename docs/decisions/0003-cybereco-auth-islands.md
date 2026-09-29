# 0003 — CyberEco auth islands: one AuthProvider per island tree, redirect-only OAuth, roles from the session

## Status

`Accepted`

Date: 2026-09-28 (plan B4; spec D1, D3)

## Context

ADR 0011 commits JustSplit to Supabase through `@cyber-eco/{types,auth,supabase}`.
`@cyber-eco/auth`'s `createAuthContext<T>()` returns a React Context
(`AuthProvider`/`useAuth`) — the standard shape for a client app, but this
tree is Astro islands (spec D3): Astro hydrates every `client:*` boundary as
its own React root, so a `<AuthProvider>` mounted in one island is invisible
to another. CLAUDE.md rule 2 also bans React Context for state shared
*between* islands outright; Nano Stores are the only cross-island mechanism.
Three further forces shaped this ADR:

- Google sign-in is a **redirect** flow (`supabase-js` navigates the browser
  away and back), not Firebase's popup. The `AuthAdapter.signInWithProvider`
  interface takes no `redirectTo`, so it always returns to the Supabase
  project's single **Site URL** — wrong for one of staging/production, which
  share one project (spec D1) and therefore need different callback origins.
- `SupabaseAuthAdapter.onAuthStateChanged` forwards only the mapped
  `AuthUser`, discarding the underlying Supabase event name — it cannot tell
  a `PASSWORD_RECOVERY` session from an ordinary sign-in.
- The `/auth/*` pages (`LoginForm`, `SignUpForm`, `ResetPasswordIsland`) need
  to call `signIn`/`signUp`/etc. before any session exists to mirror — they
  cannot depend on being inside an `AuthProvider` tree that, by definition,
  exists to reflect an *already* signed-in session.

## Decision

### 1. One `AuthProvider` per island tree + a store bridge, never shared Context

`src/lib/auth-context.ts` builds `createAuthContext<AuthProfile>()` once
(`AuthProfile`, in `src/schemas/profile.ts`, narrows `JustSplitProfile`'s
nullable `name`/`email`/`avatarUrl`/`createdAt`/`updatedAt` to satisfy
`BaseUserConstraint`'s non-null shape — an intersection type, not `Omit`,
because the schema's `.loose()` index signature makes `Omit`/`Pick` collapse
to the index signature itself and silently drop every named property).
`src/components/islands/AuthIsland.tsx` renders
`<AuthProvider config={{adapter: authAdapter, profileStore}}
createUserProfile={createJustSplitProfile} onUserProfileLoaded={onProfileLoaded}>`
plus a child, `AuthBridge`, that mirrors `useAuth()` into three Nano Store
atoms (`src/stores/auth.ts`): `currentUser → $user`, `userProfile → $profile`,
`!isLoading → $authReady`. `AuthBridge` never subscribes to
`adapter.onAuthStateChanged` itself — the provider already owns that listener
and the one-writer profile bootstrap (`profileStore.get → set` on the first
authenticated callback); a second listener would double the initial-session
callback and race profile creation.

Every route island that needs auth renders its **own** `AuthIsland` at its
own root: `ErrorBoundary > AuthIsland > AuthGate > Content` (Phase 2 wires
the `Content` side of this). Layout islands (a future `UserMenuIsland`) read
`$user`/`$profile`/`$authReady` only, never mount `AuthIsland` — that keeps
exactly one `<AuthProvider>`, and therefore exactly one
`profileStore.get → set` bootstrap race, alive at a time per page, while
still letting every island see the same session through the stores.

`createJustSplitProfile` and `onProfileLoaded` are **module-level constants**,
not inline arrows: the provider's `onAuthStateChanged` effect lists both in
its dependency array, so a fresh function identity on every render would
re-subscribe the listener continuously.

### 2. `src/stores/auth.ts`'s actions call the adapter directly, not `useAuth()`

`signIn`, `signUp`, `signOut`, `resetPassword`, `updatePassword`,
`updateDisplayProfile`, `updateProfile` call `authAdapter`/`profileStore`
(from `src/lib/data/adapter.ts`) directly rather than going through
`useAuth()`. This is deliberate: the `/auth/*` form islands are **not**
mounted inside an `AuthIsland`/`<AuthProvider>` tree (there is no existing
session to mirror while signing in for the first time), so anything routed
through `useAuth()` would require wrapping every auth page in a Provider
that has nothing to provide yet. Once a session exists, `AuthProvider`'s own
listener (wherever an `AuthIsland` is mounted next) picks it up and
`AuthBridge` mirrors it — the stores are the single source of truth either
way.

### 3. Google sign-in bypasses the `AuthAdapter` interface on purpose

`signInWithGoogle(next?)` calls a new narrow helper,
`signInWithOAuthRedirect` (`src/lib/data/client.ts`), which calls
`client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
directly, with `redirectTo = new URL(withBase('/auth/callback/'),
location.origin).href` — the **current** origin, not the project's fixed
Site URL. `next` is written to `sessionStorage` before the call (never
passed through the OAuth round-trip: the value would have to survive as a
provider-controlled query param, which some providers strip or re-encode)
and read back by `/auth/callback.astro`'s `AuthCallbackIsland`, validated
through `safeNext` (`src/lib/href.ts`) before `withBase()` navigates. Kept in
`client.ts`, not `stores/auth.ts`, so `@supabase/supabase-js` is never
imported outside `src/lib/data/` (CLAUDE.md rule 7,
`src/tests/data-boundary.test.ts`); H1 in the migration plan requests a
`signInWithProvider(provider, { redirectTo? })` overload upstream so this
workaround can retire.

The same boundary problem recurs for password recovery: a second narrow
helper, `onPasswordRecovery`, subscribes to `client.auth.onAuthStateChange`
filtered to the `PASSWORD_RECOVERY` event, because `SupabaseAuthAdapter`
discards it. `ResetPasswordIsland` uses it to switch from the request form to
the update-password form without any prop or route param signaling which
mode to render.

`safeNext` (`src/lib/href.ts`) returns `/` unless `next` matches
`/^\/(?!\/)[A-Za-z0-9_\-\/]*(\?[A-Za-z0-9_\-=&%.]*)?$/` **and** its first path
segment is one of `expenses|events|groups|friends|settlements|profile` — with
`ASTRO_BASE` unset, `withBase('//evil.example')` is a protocol-relative URL
and an open redirect that the subpath deploy would otherwise mask.

### 4. `toGuardUser` grants `roles: ['user']` from the session alone

`src/stores/auth.ts`'s `toGuardUser(user, profile)` returns
`{ id: user.uid, roles: ['user'], flags: {} }` whenever `user` is non-null,
regardless of what the `profiles` row says — `isAdmin`/`permissions` there
are user-writable and grant nothing (tested: a profile claiming
`isAdmin: true` or `permissions: ['admin']` still only yields `roles:
['user']`). `AuthGate` (`src/components/islands/AuthGate.tsx`) is
readiness/navigation only — `Skeleton` while `!$authReady`,
`location.replace(withBase('/landing/'))` once ready with no user — every
allow/deny decision happens in `<RouteGuard>` (the one gating module,
CLAUDE.md "Auth gating rules").

### 5. Redirect rules (the two decisions the plan left open)

- **Unauthenticated on a guarded page → `/landing/`.** Parity with the
  frozen Next tree's `ProtectedRoute` (`git show
  origin/main:src/components/Auth/ProtectedRoute.tsx`). `/landing` doesn't
  exist until Phase 2 (B7); a guarded redirect to a not-yet-built page is
  fine — nothing shipped currently renders `AuthGate` on a real route.
- **Signed-in on `/auth/*` → `/`.** Chosen over `/profile` (today's Next
  behavior): `/` is where B8b's dashboard will live, and redirecting there
  needs no knowledge of whether the signed-in user has a complete profile.
  `LoginForm`/`SignUpForm` implement this today via `?next=` (validated
  through `safeNext`, default `/`) rather than through `AuthGate` (neither
  page is `AuthGate`-wrapped).

### 6. No Facebook/Twitter, no `linkProvider`

`AuthProviderName` includes `facebook`/`twitter`, and
`AuthAdapter.linkProvider` exists, but neither is wired: JustSplit ships
email/password and Google only (plan B4 explicitly forbids the rest).

## Consequences

**Positive** — auth state is available to every island without React
Context crossing a hydration boundary; the redirect-only OAuth flow works
correctly across both the production custom-domain fallback and the staging
subpath deploy sharing one Supabase project; `toGuardUser`'s session-only
roles close the exact class of bug CLAUDE.md's auth gating rules exist to
prevent (a user-writable field granting access).

**Negative** — two narrow `@supabase/supabase-js` escape hatches in
`client.ts` (`signInWithOAuthRedirect`, `onPasswordRecovery`) exist because
the `AuthAdapter` interface cannot express a per-call `redirectTo` or expose
the raw auth event; both should retire once H1's upstream ask lands. Every
route island that needs auth pays a second `<AuthProvider>` mount (one React
root per island is already the deliberate cost of the islands architecture,
per spec D3).

**Neutral** — `AuthProfile` (the `BaseUserConstraint`-narrowed
`JustSplitProfile`) is a second, structurally-related type next to
`JustSplitProfile` — necessary because of the schema's `.loose()` index
signature, not indicative of a real modeling gap (every profile that reaches
the auth context went through `createJustSplitProfile`, which always stamps
a `name`).

### Auth-chunk measurement (plan B4)

`scripts/check-auth-bundle.mjs` (chained after `check:dist` in `npm run
check`) measures the gz size of every `dist/_astro/*.js` chunk reachable from
`dist/auth/signin/index.html`'s astro-island (`component-url`/
`renderer-url`, transitively through static imports) and tags which chunk
carries `@supabase/supabase-js`/`@cyber-eco/auth`, by grepping a stable
literal each ships (`GoTrueClient`, `AUTH_INVALID_CREDENTIALS`).

Measured on this branch (after the `/auth/callback/` session-wait fix):

| Chunk | gz | Contains |
|---|---|---|
| `LoginForm.*.js` | 1.26 kB | the island itself |
| `client.*.js` (Astro's React renderer) | 65.62 kB | React + ReactDOM |
| `href.*.js` | 1.55 kB | `src/lib/href.ts` + friends |
| `index.*.js` | 3.32 kB | shared small shim chunk |
| `schemas.*.js` | 43.33 kB | zod v4 + `src/schemas/*` |
| `utils.*.js` | 66.98 kB | **`@supabase/supabase-js`** |
| **Total** | **182.07 kB** | |

**`@cyber-eco/auth` is not present in any built chunk yet.** Nothing shipped
on any route mounts `AuthIsland`/`<AuthProvider>` — `LoginForm`/`SignUpForm`/
`ResetPasswordIsland` call `src/stores/auth.ts`'s actions directly, which
call `authAdapter`/`profileStore` from `src/lib/data/adapter.ts`, never
`@cyber-eco/auth`. It will enter the graph once a Phase 2 route island wraps
its content in `AuthIsland`, at which point the "two `zod` copies" concern
(the app's `zod@^4` next to `@cyber-eco/auth`'s `zod@^3.22.4` dependency)
becomes real and should be re-measured.

**The fallback the plan describes for a 150 kB-busting auth chunk is already
the architecture**: `SupabaseAuthAdapter`/`SupabaseProfileStore` are driven
from `src/stores/auth.ts` directly, with no `<AuthProvider>` import on any
`/auth/*` page. Despite that, the measured 182.07 kB total still exceeds
Inceptor's global 150 kB script budget — but the excess is React + ReactDOM
(65.62 kB, the fixed cost of any `client:only="react"` island, auth or not)
plus `@supabase/supabase-js` (66.98 kB, unavoidable for any email/password or
OAuth call) plus zod v4 (43.33 kB, needed for the `react-hook-form` +
`zodResolver` validation these forms already used before B4). None of that
is `@cyber-eco/auth` weight to strip. Rather than silently raising the global
`/*` budget, `lighthouse-budgets.json` gets a dedicated `/auth/*` entry
(`script: 195 kB`, `total: 545 kB` — measured + headroom); a hub follow-up
(`sideEffects: false` + a wider `zod` peer range on `@cyber-eco/auth`, so a
future consumer doesn't pay for a second zod copy) is out of scope here since
`@cyber-eco/auth` isn't even in this graph today.

**Amended by plan B19.** The `/auth/*` budget is no longer seeded in
`lighthouse-budgets.json` (retired: Lighthouse 12 dropped its budget audits, so it gated
nothing). It is `performance-budgets.json`'s `auth` group, enforced on every PR by
`scripts/check-budgets.mjs` against statically loaded gzipped JS: 220 kB
(`/auth/signin/` measured 209.0 after the reductions, 216.0 before). The 182.07 kB table above
predates B4's later imports and the vendor-chunk renames; `check-auth-bundle.mjs` still prints
the informational chunk graph.

## Supersedes

None.

## Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users signing in | Google sign-in must return to the origin they started from (staging vs. production, one shared Supabase project) or the PKCE exchange fails (the verifier lives in the originating origin's `localStorage`). | `signInWithOAuthRedirect` always passes an explicit `redirectTo` on `location.origin`; acceptance requires manually verifying `https://artemiopadilla.github.io/JustSplit/auth/callback/` before B18, with that origin registered in both Supabase and Google Cloud. |
| End users on an open-redirect attempt | A malicious `?next=` (or a stashed `sessionStorage` value on a shared/public machine) could otherwise send a signed-in user to an attacker-controlled origin. | `safeNext` allowlists same-origin paths in known route families only; tested against `//evil.example`, `https://evil.example`, `/\evil.example`, `/unknown/x`. |
| End users relying on role/flag gating | `!== false` on an absent field, or roles read from a user-writable row, would silently grant access (the exact bug class CLAUDE.md's auth gating rules exist to prevent). | `toGuardUser` grants `roles: ['user']` from the session only, never from `profiles.isAdmin`/`permissions`; `RouteGuard`'s existing `hasFlag`/`hasRole` tests already cover the absent-field trap. |
| Maintainer | Two narrow `@supabase/supabase-js` reads in `client.ts` (`signInWithOAuthRedirect`, `onPasswordRecovery`) are workarounds for `AuthAdapter` interface gaps, not the sanctioned seam. | Documented here and in `src/lib/data/client.ts`'s comments; H1 tracks the upstream ask (`signInWithProvider(provider, {redirectTo?})`) that would retire the first one. |
| Performance-conscious users (slow connections) | `/auth/signin/` ships 182 kB gz of script before Google/@cyber-eco/auth is even in the graph. | Measured explicitly (this ADR) rather than guessed; `lighthouse-budgets.json`'s `/auth/*` entry is seeded from the measurement so a real regression (e.g. `@cyber-eco/auth` entering the graph in Phase 2 without `sideEffects: false`) still trips CI. |

## References

- Spec D1, D3: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B4: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- ADR 0011 (Supabase via the CyberEco data layer)
- `cybereco-hub`: `docs/design/permissions-rls-doctrine.md`,
  `packages/auth/src/context/AuthContext.tsx`,
  `packages/supabase/src/auth/`
- Inceptor `docs/recipes/auth-supabase.md` §5, §8
- `src/lib/route-guard.tsx`, `src/lib/auth-context.ts`, `src/stores/auth.ts`,
  `src/lib/data/client.ts`, `scripts/check-auth-bundle.mjs`
