# 0001 — Adopt the Inceptor workflow and make Inceptor + the CyberEco data layer the only bases we maintain

## Status

`Accepted`

Date: 2026-09-27

## Context

JustSplit was a Next.js 15 / React 18 / MUI / Firebase app, untouched since
May 2025, with no issue-driven workflow, no CI quality gate, a stale and
inconsistent Firestore ruleset, and a stack that had drifted from everything
else in the portfolio. Two other assets matured in the meantime:

- **Inceptor** (`ArtemioPadilla/inceptor`): the Astro 5 + React 19 islands +
  Tailwind v4 + Base UI scaffold with the issue → prometeo → forja → centinela
  → PR → deploy loop (Issue-Driven Development).
- **cybereco-hub** (`cyber-eco/cybereco-hub`): the CyberEco data layer
  (`@cyber-eco/types`, `auth`, `supabase`, `services`) whose ADR-007 names
  Inceptor the official archetype for ecosystem apps and whose ADR-008 gates
  the Supabase adapter's relational mode on a written committed consumer.

The question: keep maintaining a third stack, or make JustSplit a downstream
consumer of the two bases we already maintain?

## Decision

1. **Adopt the Inceptor workflow first, before touching app code (Track A).**
   `CLAUDE.md`, the three sub-agents (`prometeo`, `forja`, `centinela`), the
   checklists (`ethics`, `governance`, `forbidden-imports`), the
   `doctor` / `monday` / `ship` commands, Conventional Commits + issue refs,
   branch naming `phase-N/issue-<id>-slug`, and a CI quality gate are copied
   from Inceptor and adapted. The Firebase Hosting workflows are retired.
2. **Re-platform the app on Inceptor with Supabase via the CyberEco data
   layer (Track B).** Static Astro on GitHub Pages; one island per route;
   TanStack Query over domain repos over the `StorageAdapter` interface;
   Postgres RLS per table as the only authorization
   (`permissions: { enabled: false }`); universal `Expense` / `Settlement` /
   `ExpenseGroup` types. Firebase is retired at cutover; no data is migrated.
3. **Upstream what is reusable** (Tracks C and C'): a Supabase-via-data-layer
   recipe and a brownfield playbook to Inceptor; the consumer commitment,
   relational mode and a static example to cybereco-hub.

Rejected: keeping Firebase (a second recipe to maintain, a stale ruleset to
capture, no shared data layer); Supabase without the data layer (loses the
universal types and the `StorageAdapter` seam); migrating the Nx monorepo
branch (`feat/nx-refactor`) instead of `main`.

The full design is `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
(decisions D1–D10) and the execution plan is
`docs/superpowers/plans/2026-09-18-inceptor-migration.md`.

## Consequences

**Positive** — one UI scaffold and one data layer for every project; a
repeatable issue → PR loop with a machine-checked quality bar; real
authorization (RLS) instead of a reverse-engineered ruleset; shared identity
path with the rest of the CyberEco ecosystem once ADR-009 lands there.

**Negative** — the Next app is rewritten rather than evolved (26 routes, 21k
lines); JustSplit depends on the hub's gate C1 for the upstream relational
mode (mitigated by a local `StorageAdapter` contingency); Track A rules run on
a tree that still violates them, so `centinela` scans only changed files until
B1.

**Neutral** — the live Next site stays on Firebase Hosting, unchanged, until
the cutover PR; the `feat/nx-refactor` branch is not an input.

## Supersedes

None.

## References

- `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
- `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
- `cybereco-hub/docs/adr/ADR-007-inceptor-app-archetype.md`
- `cybereco-hub/docs/adr/ADR-008-supabase-storage-adapter.md`
- PR #2 (plan), Track A issues A1–A6
