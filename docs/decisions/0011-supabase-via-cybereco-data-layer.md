# 0011 — Use Supabase through the CyberEco data layer; retire Firebase

## Status

`Accepted`

Date: 2026-09-28 (owner decision 2026-09-27; spec D1)

## Context

JustSplit's Next.js tree ran on Firebase Auth + Firestore with a stale ruleset
and no data worth keeping. The migration to the Inceptor scaffold (ADR 0001)
needs a backend a **static** client can use safely, and the CyberEco portfolio
already standardises on one: `cybereco-hub/docs/adr/ADR-007` makes Inceptor +
`@cyber-eco/auth` + the data layer the official archetype for CyberEco apps,
and `ADR-008` makes Supabase the storage backend behind the `StorageAdapter`
interface.

Forces:

- A static client has no server to enforce permissions. Authorization must
  live in the database (Postgres RLS), per
  `cybereco-hub/docs/design/permissions-rls-doctrine.md` §1.1.
- The upstream `SupabaseStorageAdapter@0.2.1` implements **document mode**
  only: every collection is a row of `public.documents`, whose RLS is
  `owner_id is null OR owner_id = auth.uid()`. Shared group data under that
  policy is either invisible to co-members or, with a null owner, readable
  and writable by every authenticated user.
- Relational mode (the `SchemaMap` design) is gated upstream by ADR-008:
  (1) a committed consumer, (2) the design docs, (3) gate C1, a public Hub
  deploy with at least one real user (Story 0.3, owner action, pending).
- The packages are private on GitHub Packages under the `cyber-eco`
  organisation, so `ArtemioPadilla/JustSplit`'s `GITHUB_TOKEN` cannot read
  them.

## Decision

1. **Supabase, consumed through `@cyber-eco/{types,auth,supabase}`.** Firebase
   (Auth, Firestore, Hosting, project `justsplit-eef51`) is retired at cutover
   (plan B20). No Firestore data is migrated; the schema starts clean
   (spec D10).
2. **One construction point.** `src/lib/data/client.ts` is the only module
   that creates a Supabase client (guarded: `null` when
   `PUBLIC_SUPABASE_URL` / `PUBLIC_SUPABASE_KEY` are absent, PKCE flow);
   `src/lib/data/adapter.ts` is the only module that imports
   `@cyber-eco/supabase`. Islands and stores go through
   `src/lib/data/repos/*` over the `StorageAdapter` interface. Enforced by
   `src/tests/data-boundary.test.ts`.
3. **Never document mode for shared data.** The upstream adapter is only ever
   constructed with a `schemaMap` (a test scans every construction). Until
   the hub publishes relational mode (plan H2), `adapter.ts` exports the
   **contingency** `RelationalSupabaseAdapter` (plan B5a): a local
   `StorageAdapter` implementation of the SchemaMap design (real columns,
   `extra` jsonb overflow, Realtime `postgres_changes`), upstreamed as Track
   C' H2 once gate C1 clears.
4. **RLS is the only authorization.** The client instantiates no permission
   service (`permissions: { enabled: false }` holds structurally). Every
   table has `ENABLE ROW LEVEL SECURITY` and policies, proven by the B2b
   suite for member / non-member / anonymous.
5. **Two identity contexts.** JustSplit has its own Supabase project and
   `auth.users`. Hub ↔ app SSO is out of scope (ADR-009 in the hub, still
   Proposed).
6. **Package access.** Target: a classic PAT with `read:packages` issued by a
   `cyber-eco` member, stored as `GH_PACKAGES_TOKEN` (GitHub Packages' npm
   registry does not accept fine-grained PATs). **Outcome at B1/B2a:** the
   token does not exist yet, so the three packages are **vendored** as
   `npm pack` tarballs in `vendor/` (built from `cyber-eco/cybereco-hub@08a521f`),
   referenced with `file:` specifiers plus an `overrides` entry that keeps a
   single `@cyber-eco/types`. `vendor/README.md` documents the rebuild and
   the switch back to the registry. The committed `.npmrc` carries only the
   scope → registry line, never an `_authToken`.

Rejected alternatives:

- **Keep Firebase** — a second, unsanctioned recipe to maintain, a stale
  ruleset to reverse-engineer, no shared data layer.
- **Supabase without the data layer** (raw `supabase-js` in repos) — loses
  the universal types and the `StorageAdapter` seam that Track C' upstreams.
- **Document mode now, relational later** — the owner-only `documents` RLS
  makes shared data either broken or world-readable; not acceptable even
  temporarily.
- **Wait for gate C1** — blocks the whole of Track B on an unrelated owner
  action; the contingency adapter removes the dependency.

## Consequences

**Positive** — authorization is enforced by the database, testable in CI;
one backend, one doctrine and one adapter across the portfolio; the repo
layer is backend-agnostic behind `StorageAdapter`; `npm ci` works for anyone
without a token while the packages are vendored.

**Negative** — a local relational adapter to maintain until H2 ships
upstream; vendored tarballs must be rebuilt by hand on every upstream
change; Supabase becomes a hosted dependency with its own availability and
pricing.

**Neutral** — the Supabase public config (project URL + anon key) is public
by design and travels as repository **variables**; `ci.yml` builds without it
on purpose to exercise the guarded path.

### Stakeholder Analysis (`risk:high`)

| Stakeholder | Impact | Mitigation |
|---|---|---|
| End users | Their account, groups, expenses and settlements now live in the Supabase project's region (chosen closest to Mexico at creation, an AWS region operated by Supabase) instead of Firebase. | Region recorded in `SETUP.md` §4 when the project is created; privacy notice updated at cutover (B20). |
| End users (erasure) | Right to delete: data must be removable on request. | RLS delete policies let a user delete their own rows; account deletion follows the owner runbook (`docs/runbooks/`, written with B2) that removes the `auth.users` row, cascading to owned rows, and anonymises shared ledgers. |
| Co-members of a group | A wrong policy would leak one member's ledger to non-members. | Deny-by-default RLS; B2b suite proves member / non-member / anonymous outcomes before any feature ships; no document mode. |
| Maintainer | Owns the Supabase project, the vendored packages and the contingency adapter. | Owner-actions log in `SETUP.md`; `vendor/README.md`; H2 retires the contingency. |
| CyberEco hub | Gains its first committed relational-mode consumer (ADR-008 gate 1). | Contingency adapter written to the hub's `SchemaMap` design so it upstreams unchanged. |

## Supersedes

None. (Replaces the pre-migration Firebase setup, which had no ADR.)

## References

- Spec D1, D3, D10: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- Plan B2a, B2, B2b, B5a, H1–H3: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `cyber-eco/cybereco-hub`: `docs/adr/ADR-007`, `ADR-008`, `ADR-009`,
  `docs/design/permissions-rls-doctrine.md`, `docs/design/schema-map-strategy.md`,
  `docs/design/storage-adapter-contract.md`,
  `packages/supabase/db/migrations/20260704000001_documents.sql`
- Inceptor `docs/recipes/auth-supabase.md` §2 (guarded client)
- ADR 0001 (adopt the Inceptor workflow)
