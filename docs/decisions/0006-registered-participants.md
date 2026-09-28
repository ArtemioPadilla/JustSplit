# 0006 — Registered-user friends and participants, exact-email lookup only

## Status

`Accepted`

Date: 2026-09-28 (spec §4/D10 "Friends"; plan B10 pulls the participant-pool
decision forward, plan B13 owns the full scope and this file)

## Context

The legacy Next tree's `/friends` page (`src/app/friends/page.tsx`,
`sendFriendRequest`/`getUserFriendships`/`updateFriendshipStatus`/
`removeFriendship` in `services/firebaseService`) already modelled friendship
as a persisted `Friendship` row (`users: [a, b]`, `status`, `requestedBy`) —
that data model survives the migration unchanged (spec D10, `friendships`
table). What does NOT survive is how a user is found to send a request to,
and how the legacy `User` type tracked friendship at all:

- The legacy page held `state.users` — every user in the app — in memory
  (`AppContext`), so `/friends` could browse/search all of them by name or
  email and render a live "not a friend yet" row for each. There is no
  equivalent in the target tree: `profiles` RLS is own-row only (spec D10,
  ADR 0002's "no `users` list" reasoning) — there is no query that returns
  "every user," and building one would mean either widening `profiles`
  SELECT to all-authenticated (a directory of every email/phone/preference
  in the app, to every signed-in stranger) or a new denormalised "public
  profile" table just to power a search box. Neither is worth it for a
  feature (browse everyone) product decisions never asked for beyond
  powering the exact-email add flow that already existed.
- `/friends/add` (`src/app/friends/add/page.tsx`) was local-only: its
  `ADD_USER` dispatch created a row in the in-memory `AppContext.users`
  array and nothing else — no Firestore write, no request sent. It never
  did what its own UI implied.
- `User.friends` / `User.friendRequestsSent` / `User.friendRequestsReceived`
  (`src/reducers/friendsReducer.ts`) were derived, denormalised arrays kept
  in sync by hand on every accept/reject/remove action. The universal
  `Friendship` row (`@cyber-eco/types`) is the only source of truth in the
  target tree — there is no parallel array to keep in sync, by construction
  (D10: relational mode via the SchemaMap, never a document users own that
  a peer also needs to trust).

Two lookup alternatives for the add-by-email flow:

1. **A user-writable `profiles.email` column, searched directly.** Rejected:
   `profiles.email` is not confirmed and not even guaranteed to be the
   account's real login email — a user could set it to anything, including
   a victim's real address, and receive that victim's friend requests
   instead of them (this exact failure mode is why `find_profile_by_email`
   exists at all — see `db/migrations/20260928000009_profile_lookup_functions.sql`'s
   own comment).
2. **Exact-match lookup against `auth.users.email` (the confirmed login
   email) through a `SECURITY DEFINER` function, `find_profile_by_email`.**
   **Chosen** — already shipped in the B2 migration, unused until B10/B13.
   Confirms `email_confirmed_at is not null` and compares
   case-insensitively; returns only `{id, name, avatarUrl}` — never the
   email itself back to the caller, and never more than one row.

## Decision

**Participants and friends must be registered JustSplit users**, found only
by exact, confirmed email through `find_profile_by_email` — never by name,
never by partial match, and never against `profiles.email`. This applies
uniformly everywhere a "who can be on this row" pool is built: `/friends`'s
add-by-email form (B13), the expense form's `ParticipantPicker` (B10, pulled
this decision forward before this file existed), and groups/events'
member pickers (B12/B11b, accepted friends or a group's own members — never
free text).

**Kept** from the legacy tree:

- The `friendships` row shape and status machine (`pending` /`accepted` /
  `rejected`, `requestedBy`) — unchanged, now the universal `Friendship`
  (`@cyber-eco/types`).
- `/friends`'s three list sections (Friend Requests received / Friends /
  Sent Requests with Cancel) and its own add-by-email form — the page kept
  its shape, only its lookup and persistence changed (`find_profile_by_email`
  instead of an in-memory `state.users.find`; a real `friendships` insert
  instead of nothing).
- Accept/reject/remove/cancel as the four actions over that one row.

**Dropped**:

- The browsable all-users directory search (no query for it exists or
  should exist; own-row `profiles` RLS, above).
- `/friends/add`'s local-only form (`ADD_USER` never persisted anything) —
  the route now redirects to `/friends`, which already has its own working
  add-by-email form (plan B13, `src/pages/friends/add.astro`).
- `User.friends[]` / `friendRequestsSent[]` / `friendRequestsReceived[]` and
  `friendsReducer` — no denormalised array to keep in sync; `friendships` is
  the only source of truth.

**New**: an email that doesn't resolve to any registered account offers an
invitation instead of a dead end — a `mailto:` link (opens the SIGNED-IN
USER's own mail client; JustSplit never stores or transmits the invitee's
email itself) and a "Copy invite link" button copying the absolute,
token-less `withBase('/auth/signup/')` URL on the current origin. No avatar
or name preview is ever shown before a request is sent, for either outcome
(privacy — see Stakeholder Analysis).

**Row shape and authorization** (unchanged from the B2 migration/B2b suite,
plan B13 adds no migration): `friendships_pair_uniq` — one row per unordered
pair, **no partial predicate**, so ANY existing row (pending, accepted, OR
rejected) blocks a fresh insert for that pair as a unique violation.
`friendships_insert` requires `requested_by = auth.uid()`, the caller on
`users`, `cardinality(users) = 2`, `status = 'pending'`.
`guard_friendships` (before-update trigger) makes `users`/`requested_by`
immutable and restricts a `status` change to the RECIPIENT
(`actor <> old.requested_by`) — accept/reject are both a recipient-only
`status` update, never a delete. `friendships_delete` allows EITHER party
regardless of status — Remove (an accepted row) and Cancel (a pending row,
by the requester) are the exact same delete.

**Duplicate-pair mapping** (`repos/friendships.ts#request`): rather than
catching Postgres's `23505` unique-violation by code, `request()`
pre-checks `existsForPair` and throws `FriendshipAlreadyExistsError` before
writing. This is deliberate, not a stylistic choice: `RelationalSupabaseAdapter.setDocument`
(`src/lib/data/relational-adapter.ts`) wraps every write failure into a
plain `Error(message)` string and discards the original error's `.code`, so
there is nothing to catch by code from the repo layer today. The pre-check
is deterministic and is what `src/lib/data/repos/repos.test.ts` actually
exercises against the in-memory adapter; the DB's own unique index stays
the authoritative defense against a genuine race between two
near-simultaneous requests for the same pair — an extremely narrow window
that, if hit in production, surfaces as the generic insert-failure toast
instead of this specific message. This is a known, accepted gap, not
silently claimed to be fully closed. **This message itself is a small,
accepted enumeration leak**: "You already have a request or friendship
with this person" tells the requester that SOME `friendships` row exists
for that pair — pending, accepted, or rejected — without saying which. A
requester who was rejected and tries again therefore learns "a row exists"
(not "you were rejected," which stays hidden per the leaked-id reasoning
below) — a strictly narrower disclosure than the legacy directory search
this ADR already drops, and considered acceptable for the same reason a
duplicate-request error is acceptable at all: the requester already knows
they've interacted with this email before.

**Reject is a recipient-only `status` update, not a delete — the row is
kept on purpose, and the recipient gets an Undo, not a dead end.**
`partitionFriendships` (`src/domain/friends.ts`) buckets a `status:
'rejected'` row ASYMMETRICALLY: into a new `declined` bucket ONLY for the
RECIPIENT (`requestedBy !== uid`) — `/friends`' "Declined requests"
section, one row per declined request, an **Undo** button
(`useRemoveFriendship`, the same delete Cancel/Remove already use — never a
status change) that frees the pair for a future request from either side.
For the ORIGINAL REQUESTER (`requestedBy === uid`) the same row lands in NO
bucket at all — their pending item simply disappears from Sent Requests,
with no "declined" indicator anywhere on their side (recipient privacy: the
leaked-id reasoning extends to "were you rejected," not just "does this
account exist"). Keeping the row (rather than Reject deleting it outright)
is the point, not an oversight: it is what stops the requester from
re-spamming a pair the recipient already said no to (`friendships_pair_uniq`
has no partial predicate — ANY existing row, including a rejected one,
blocks a fresh insert) — Undo is the recipient's own, deliberate choice to
lift that block, not something that happens automatically or from the
requester's side.

## Alternatives considered

- **Keep the legacy directory search, scoped to `profiles.name`/`.email`
  columns readable by every authenticated user.** Rejected: widens
  `profiles` SELECT (which also holds `preferences`, `permissions`,
  `isAdmin`) to every signed-in stranger, for a feature (browse everyone)
  the product never explicitly required — the add-by-email flow already
  covers "I know who I want to add."
- **A token-based invite** (a unique invite link tied to the inviter and,
  optionally, the invitee's email) for the unregistered-email case.
  Rejected for this issue: meaningfully more surface (a new table or
  signed-token scheme, an acceptance flow on `/auth/signup`) for a feature
  whose only job today is "don't dead-end." A plain link to the existing
  sign-up page is enough until there's a concrete reason (e.g. attributing
  signups to inviters) to build more.
- **Catch the DB's unique-violation error code in the repo layer** instead
  of a pre-check query. Rejected for now, not forever: it would need
  `RelationalSupabaseAdapter.setDocument` to preserve the original error's
  `.code` instead of collapsing it into a message string — a change to
  shared data-layer code beyond this issue's stated scope ("no migration").
  Recorded above as the accepted gap this ADR leaves open.
- **Make Reject a delete, matching Cancel's own semantics**, instead of a
  `status: 'rejected'` update. This was the leading alternative for
  resolving the rejected-row dead end (coordinator review). Rejected in
  favor of keeping `status: 'rejected'` (per the plan) plus a recipient-only
  Undo: a plain delete on Reject would let the ORIGINAL REQUESTER re-send
  immediately (the pair frees the moment the row is gone), which is exactly
  the re-spam a recipient who just said no would not want. Keeping the row
  and giving the RECIPIENT (not the requester) the only path back to a
  clean slate keeps the requester's ability to try again entirely in the
  recipient's hands, matching who `guard_friendships` already trusts with
  the `status` field.

## Consequences

**Positive** — No directory of every user's identity is ever exposed to
every signed-in stranger; the confirmed-email lookup can't be hijacked by
setting `profiles.email` to a victim's address; Cancel/Remove/Accept/Reject
map onto exactly the RLS policies already shipped, so the client never
needs its own authorization logic beyond UX-only button visibility.

**Negative** — User enumeration is inherent to "does this email have an
account?" (see Stakeholder Analysis) and there is no server-side rate limit
on `find_profile_by_email` today; the duplicate-pair message also leaks a
narrower fact — "some row exists for this pair" — to a requester retrying
after a rejection (above).

**Neutral** — The unregistered-email invite is a plain mailto/link, not a
tracked invitation system; nothing is measured about whether an invite
converts.

## Stakeholder Analysis

> **Rate-limit follow-up superseded by [ADR 0013](./0013-membership-lifecycle.md)** (plan B2d): `find_profile_by_email` now enforces 30 lookups per caller per hour server-side. The "no server-side rate limit" statements below are the historical record.

| Stakeholder | Impact | Mitigation |
|---|---|---|
| The requester | Sends a request that either lands as a pending row the recipient sees, or (unregistered email) gets an invite path instead of silence. A duplicate attempt gets a specific, honest message instead of a confusing generic failure — but if that duplicate is because the recipient rejected them, the message is the SAME generic "already have a request or friendship with this person," never "they rejected you." The requester learns only that some row exists for the pair, not its status; if the recipient later hits Undo, the requester gets no notification either — they simply CAN send a fresh request the next time they try, with no explanation of why it started working. | `existsForPair` pre-check + `FriendshipAlreadyExistsError` (the message's own narrow enumeration leak — "a row exists" — is named and accepted above, not hidden); the unregistered branch never claims the request was "sent" — it's explicit that no account exists; nothing on the requester's side ever renders "declined" (`partitionFriendships`: their own view of a rejected row has no bucket at all). |
| The recipient, including an unwanted request | Anyone who has their email can send a request; the recipient can Reject it, which is enforced server-side (`guard_friendships`: only the recipient may change `status`) so the requester cannot self-accept. **Resolved (coordinator review, B13 follow-up)**: Reject keeps the row (protecting the recipient from re-spam — the pair-unique index blocks a fresh request as long as ANY row exists) but the recipient is not stuck with it forever — a "Declined requests" section (`partitionFriendships`'s `declined` bucket, recipient-only) shows the requester's name with an Undo button that DELETES the row, freeing the pair for either side to request again whenever the recipient decides they're ready, entirely on the recipient's own timeline. A removed (not rejected) friendship works the same way — `friendships_delete` allows either party and always frees the pair. |
| A person whose email is looked up (enumeration) | The lookup result — registered vs. not — is inherently revealing: a registered email creates a visible pending row; an unregistered one gets an invite path. This is authenticated-only (never reachable by an anonymous caller — `find_profile_by_email` is `revoke`d from `public, anon`) and exact-match (no partial/fuzzy search widens the blast radius to "anyone whose email starts with..."). There is no server-side rate limit on this function today, so an authenticated user could enumerate many candidate emails in a script. | Recorded as an open follow-up for the function owner: add a rate limit either inside `find_profile_by_email` (e.g. a per-caller counter table checked before the query) or at an edge/proxy layer in front of Supabase RPC calls. Not built in this issue — a decision for whoever owns that infrastructure, not something the client can enforce on itself. |
| An unregistered invitee | Their email never reaches JustSplit's servers as a matter of app behavior beyond the lookup call itself (which only checks existence, stores nothing about the query) — the mailto opens the REQUESTER's own mail client with the invitee's address as the `to`, and JustSplit's own storage/logs gain no new record of that email. The invite body carries no personal data beyond the requester's own display name (optional). | No token, no invite record, no expiry to manage — there is nothing stored to leak. If the requester chooses not to send the mailto and instead pastes the copied link elsewhere, that's the requester's own action, outside this app's control (same as sharing any public URL). |

## Supersedes

None.

## References

- `db/migrations/20260928000003_justsplit_tables.sql` (`friendships` table,
  `friendships_two_distinct_users`, `friendships_pair_uniq`)
- `db/migrations/20260928000004_rls_policies.sql` (`friendships_select/insert/update/delete`)
- `db/migrations/20260928000005_guard_triggers.sql` (`guard_friendships`)
- `db/migrations/20260928000009_profile_lookup_functions.sql` (`find_profile_by_email`)
- `src/tests/rls/friendships.test.ts`, `src/tests/rls/functions.test.ts`
- `src/domain/friends.ts`, `src/lib/data/repos/friendships.ts`
- `src/components/islands/FriendsIsland.tsx`, `src/components/islands/routes/FriendDetailView.tsx`
- `src/components/features/friends/AddFriendForm.tsx`
- Legacy: `src/app/friends/page.tsx`, `src/app/friends/add/page.tsx`,
  `src/app/friends/[id]/page.tsx`, `src/reducers/friendsReducer.ts`
  (`git show origin/main:<path>`)
- Plan: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`, issue B13
  (and B10's pulled-forward participant-pool decision)
- Spec: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md` §4,
  D10
