# 0012 — Profile and account settings: preferences merge, avatar replace ordering, global sign-out

## Status

`Accepted`

Date: 2026-09-28 (plan B15)

## Numbering note

The plan's own pre-assignment table (`docs/superpowers/plans/2026-09-18-inceptor-migration.md`,
"ADRs" section) reserves `0009` for `cutover-and-firebase-retirement` (B20)
and `0010` for `relationship-kinds-and-conceptos` (D1) — both later issues
that have not landed yet. `0011` is already in use
(`0011-supabase-via-cybereco-data-layer.md`, B2a, itself numbered after 0010
for the same reason its own header records). Reusing `0009` for this issue
would collide with B20's future ADR of the same number, so this document is
`0012` — the next number after the highest one actually in use, following
the same "check pre-assignments first" rule the plan states for every ADR.

## Context

`/profile` is this migration's first `risk:high` page that is simultaneously
a settings surface (name, phone, avatar, preferred currency) AND a
destructive-action surface (change password, sign out, wipe local data).
Four separate hazards needed a considered answer before writing any code:

1. **The preferences write is a whole-column replace, not a merge.**
   `SupabaseProfileStore.update` (`@cyber-eco/supabase`,
   `src/auth/SupabaseProfileStore.ts`) is
   `client.from('profiles').upsert({ id, ...sanitize(partial), updatedAt })`
   — a plain upsert. When `partial.preferences` is present, Postgres writes
   that ENTIRE jsonb value over the column; it does not merge it with what
   was there. `DashboardIsland`'s pre-existing currency handler
   (`await updateProfile({ preferences: { ...profile?.preferences,
   preferredCurrency: code } })`) already worked around this correctly by
   spreading the current preferences inline — but inline, unenforced, and
   only at that one call site. The profile island adds a SECOND writer of
   `preferences` (the phone number) and a THIRD (its own currency selector);
   without a single enforced rule, one of the three would eventually ship
   without the spread and silently wipe whatever the other writers had set.
2. **Avatar replace has three ways to leave the user's storage or profile
   row in a bad state**: an orphaned new object (upload succeeds, the row
   update fails), an orphaned old object (the row update succeeds but the
   old object is never removed, forever), or a needless removal attempt
   against a path that was never this user's own object (a spoofed or
   external `avatarUrl` on the user-writable `profiles` row).
3. **"Sign out" reads differently depending on scope**, and the adapter only
   offers one: `SupabaseAuthAdapter.signOut()` calls `auth.signOut()` with no
   `scope` argument, which is Supabase's default `global` scope — every
   session for that user, on every device, is revoked. A button labelled
   plain "Sign out" would under-promise what actually happens.
4. **Password change UX**: does the form need a "current password" field?

## Decision

### 1. Preferences merge: `buildPreferencesPatch` (`src/domain/profile.ts`)

A single pure helper is the only sanctioned way to build a `preferences`
write:

```ts
export function buildPreferencesPatch(
  current: Partial<JustSplitProfilePreferences> | undefined,
  patch: Partial<JustSplitProfilePreferences>,
): JustSplitProfilePreferences {
  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete merged[key];
    else merged[key] = value;
  }
  return merged as JustSplitProfilePreferences;
}
```

Every call site that writes `preferences` — `ProfileForm`'s phone-number
save, `ProfileForm`'s own currency selector, and `DashboardIsland`'s
currency selector (refactored in this issue from its inline spread to this
helper) — goes through it. A key patched to `undefined` is DROPPED from the
result rather than kept as an `undefined`-valued property, which is the one
way to clear an optional field (`phoneNumber`) client-side: an
`undefined`-valued key would otherwise survive as a JS object property (only
`JSON.stringify` would incidentally drop it on the wire), and relying on that
incidental behavior instead of an explicit rule is exactly the kind of thing
this ADR exists to stop.

`src/domain/profile.test.ts` (pure) and `ProfileForm.test.tsx` (integration,
mocking `updateProfile`) both assert the two-way invariant by name: saving
the phone keeps `preferredCurrency`, saving the currency keeps
`phoneNumber`.

**Alternative rejected**: teach `SupabaseProfileStore` (or a JustSplit
wrapper around it) to merge `preferences` server-side (e.g. a Postgres
`jsonb || jsonb` concat via an RPC, or a `guard_profiles` trigger).  Rejected
because `SupabaseProfileStore` is a shared `@cyber-eco/supabase` primitive
used the same way by every CyberEco app pinned to this contract change would
either fork the package or require an upstream release; the client-side
helper is a two-line fix that keeps the vendored contract exactly as it is
and is trivially unit-testable in isolation.

### 2. Avatar replace ordering (`AvatarUploadField`, `src/components/features/profile/`)

Strict sequence, each step gated on the previous one succeeding:

```
uploadAvatar(uid, file)                 -- new object, new random path
  -> updateProfile({ avatarUrl: newPath })   -- row now points at the NEW object
    -> removeAvatar(oldPath)                 -- ONLY NOW is the OLD object removed
```

- **A failed `updateProfile`** removes the just-uploaded NEW object instead
  (best-effort; a failure there is swallowed since the user-facing error is
  reported either way) — the row was never pointed at it, so leaving it
  would orphan it forever with nothing left to clean it up.
- **A failed `removeAvatar(oldPath)`** is reported as `notifyInfo` — "Photo
  updated, but the old one couldn't be removed" — never `notifyError`: the
  user-visible outcome (their photo changed) already succeeded; the leaked
  old object is a storage-quota concern, not a correctness one, and does not
  deserve the same alarm as an actual failure to update the photo.
- **Defensive path check**: `removeAvatar` is only ever called when
  `oldPath.startsWith('avatars/${uid}/')`. `oldPath` is read off the
  user-writable `profiles.avatarUrl` column — nothing stops a client from
  writing an arbitrary string there before this code runs (there is no
  server-side format check on that column; the RLS policies only gate WHO
  may write the row, not the VALUE written). Postgres storage RLS
  (`db/migrations/20260928000007_receipts_storage.sql`,
  `receipts_avatars_delete`) already denies a delete of anything outside
  `avatars/{uid}/` — this check does not add security, it avoids generating
  a doomed network round-trip and a needless error path for a value that
  could never legitimately be this user's own avatar object (an external
  URL, or a copy-pasted path belonging to someone else). Confirmed by
  `AvatarUploadField.test.tsx`'s two path-guard cases: an external URL and
  another user's `avatars/{other-uid}/…` path are never passed to
  `removeAvatar`.

The avatar is displayed through `ReceiptImage`'s existing signed-URL
resolution (same `receipts` bucket, `avatars/{uid}/` prefix, ADR 0005) — no
new signed-URL logic was needed.

### 3. "Sign out everywhere" (`AccountSettings`)

The button is labelled **"Sign out everywhere"**, with copy stating
explicitly that it signs out every device with an active session, not just
this one. This is a direct, honest reflection of what
`SupabaseAuthAdapter.signOut()` already does (Supabase's default `global`
scope) — no new adapter method, no new scope plumbing. A single-device sign
out is NOT built: it would need `client.auth.signOut({ scope: 'local' })`
called directly against `@supabase/supabase-js`, which no module outside
`src/lib/data/` is allowed to import (CLAUDE.md rule 7); adding it would mean
either a new `authAdapter` method (real scope, deferred: no issue in the
plan asks for it) or a boundary violation. Explicitly out of scope per the
plan text itself.

After signing out, the page navigates to `withBase('/landing')`
(`window.location.assign`, a full page load in this static MPA — spec D2).
The result toast is queued with `{ afterNavigation: true }` (ADR 0008's
cross-navigation toast handoff) — a toast fired synchronously right before
`location.assign()` would otherwise be discarded by the tab tear-down before
it ever renders.

### 4. Password change: no "current password" field

`updatePassword` (`src/stores/auth.ts`) calls
`SupabaseAuthAdapter.updatePassword`, which updates the password for the
CURRENT, already-authenticated session (`auth.updateUser({ password })`) —
Supabase does not require re-proof of the old password for this call. Asking
for one anyway would be a UX tax with no corresponding security check behind
it. The form states this explicitly ("You're already signed in, so we don't
need your current password — just choose a new one") instead of leaving the
visitor to wonder why the field is missing. Strength rule is the sign-up
form's own (`RegisterSchema.shape.password`, `src/schemas/register.ts`)
reused via `ChangePasswordSchema`, not duplicated, plus a `confirmPassword`
field the sign-up form has no need for.

## Consequences

**Positive** — the preferences-merge bug can no longer be reintroduced one
call site at a time (the next writer of `preferences`, in Track D or later,
has one obvious helper to reach for, and `DashboardIsland`'s working-but-
unenforced inline version is gone); avatar replacement never orphans an
object it can still identify, and never generates a doomed removal call
against a path that was never going to be this user's own; the sign-out
button's copy matches its real, global blast radius instead of implying a
narrower one.

**Negative** — `buildPreferencesPatch` is a convention, not a compiler-
enforced one: nothing stops a future call site from writing
`updateProfile({ preferences: { phoneNumber } })` directly and reintroducing
the bug (same class of residual risk ADR 0008 already accepted for
`{ afterNavigation: true }`). A failed `removeAvatar(newPath)` cleanup
attempt (the failed-`updateProfile` branch) is swallowed silently — there is
no second-order retry or reporting of "this orphaned object also failed to
clean itself up"; it is accepted as a rare, low-severity storage-quota
concern rather than engineering a retry queue for it.

**Neutral** — single-device sign-out remains unbuilt, as the plan text
requires; a future issue that wants it needs a new `authAdapter` method
(local scope) rather than a shortcut through `@supabase/supabase-js`
directly from an island.

### Stakeholder Analysis

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The user editing their own profile | The preferences-merge bug, if shipped, would silently discard whichever of phone/currency they set LEAST recently — a genuinely confusing, hard-to-notice data loss (nothing errors; the field is just quietly back to its old value). | `buildPreferencesPatch` used at every writer, asserted by both a pure unit test and a component-level integration test that a save of one field can never observably change the other. |
| Someone using a shared/borrowed device | "Sign out" with unclear scope could either under-deliver (they think every device is signed out and it isn't) or the actual behavior could surprise a user who only meant to sign out THIS device. | The button is explicitly labelled and captioned "everywhere" / "every device" — no ambiguity about the blast radius before they click it. |
| The user whose OLD avatar is replaced | If the storage-cleanup ordering were reversed (old object removed before the row update lands), a failed update would leave the profile pointing at a photo that no longer exists. | The ordering in this ADR guarantees the row is never pointed at a missing object: the old object is only ever removed AFTER the row already points at the new one. |
| A user whose `avatarUrl` was ever set to something else's path (a bug, a compromised session, manual devtools tampering) | Without the defensive check, a later legitimate avatar change by that account would attempt to delete a path it doesn't own — RLS denies it, but the code would still generate an error for something that could never have worked, and (in a differently-written implementation that didn't check this first) might leak information about what paths exist. | The path-prefix guard means `removeAvatar` is never even attempted for a path outside the caller's own `avatars/{uid}/` prefix — enforced by test, not just by trusting RLS as the only line of defense. |
| Future contributors adding the next writer of `preferences` (Track D: budgets, categories, conceptos) | Without a named, tested helper, it's easy to reach for the working-but-fragile inline-spread pattern `DashboardIsland` used before this issue, or skip the spread entirely. | `buildPreferencesPatch` is the one documented, tested entry point; this ADR and its doc comment both state the invariant it exists to protect. |

## Supersedes

None.

## References

- Plan B15: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- Spec D10 (`profiles` table, own-row RLS never widened, `preferences` jsonb
  holding `preferredCurrency`/`phoneNumber`):
  `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- `src/domain/profile.ts` + `.test.ts` (`buildPreferencesPatch`)
- `src/schemas/profile-edit.ts` + `.test.ts`, `src/schemas/change-password.ts`
  + `.test.ts`
- `src/components/features/profile/AvatarUploadField.tsx` + `.test.tsx`
- `src/components/features/profile/ProfileForm.tsx` + `.test.tsx`
- `src/components/features/profile/AccountSettings.tsx` + `.test.tsx`
- `src/components/islands/ProfileIsland.tsx` + `.test.tsx`,
  `src/pages/profile.astro`, `src/tests/profile-page.test.ts`
- `src/components/islands/UserAccountMenu.tsx` (the "Profile" link) +
  `UserMenuIsland.test.tsx`
- `src/lib/data/storage.ts` (`uploadAvatar`, `removeAvatar`, `avatarPath`,
  `resizeImage`), `db/migrations/20260928000007_receipts_storage.sql` (the
  avatar storage RLS policies this ADR's defensive check is redundant with)
- `src/components/features/ReceiptImage.tsx` (reused, unmodified, for the
  avatar's signed-URL display)
- `src/components/features/settings/ResetLocalDataButton.tsx` (B17b, mounted
  here, not duplicated) and ADR 0008 (toast topology, the `afterNavigation`
  handoff this issue's sign-out flow relies on)
- `src/schemas/register.ts` (`RegisterSchema.shape.password`, reused by
  `ChangePasswordSchema`)
- The legacy profile page, for the ported phone regex only (no legacy tests
  existed to port): `git show origin/main:src/app/profile/page.tsx`
