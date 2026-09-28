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

## References

- Spec D10 "Images": `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2 (migration), B5b: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- ADR 0002 (canonical schema and RLS), ADR 0004 (TanStack Query over
  StorageAdapter), ADR 0011 (Supabase via the CyberEco data layer)
- `db/migrations/20260928000007_receipts_storage.sql`
- `src/lib/data/storage.ts`, `src/lib/data/repos/expenses.ts`,
  `src/components/features/ReceiptImage.tsx`
- `src/tests/rls/storage.test.ts` (`npm run test:rls`), `src/tests/storage.live.test.ts`
  (`npm run test:contract:live`), `src/lib/data/storage.test.ts`,
  `src/lib/data/repos/expenses.remove.test.ts`
