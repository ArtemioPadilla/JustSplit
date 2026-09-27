# Roadmap

## Status (2026-09-27)

JustSplit is being re-platformed from Next.js 15 + Firebase onto the
[Inceptor](https://github.com/ArtemioPadilla/inceptor) scaffold (Astro 5 +
React 19 islands + Tailwind v4 + Base UI) with **Supabase through the CyberEco
data layer** (`@cyber-eco/*`) as the backend. No user data is migrated; Firebase
is retired at cutover. The full design is the
[spec](./docs/superpowers/specs/2026-09-18-inceptor-migration-design.md); the
execution order is the [plan](./docs/superpowers/plans/2026-09-18-inceptor-migration.md).

The live site on Firebase Hosting stays as last deployed until the cutover PR.

## Tracks

| Track | Milestone | Scope | Status |
|---|---|---|---|
| **A. Workflow adoption** | `v0.2 - Inceptor workflow` | `CLAUDE.md`, sub-agents, checklists, CI gate, templates, AI triage, hygiene | A1–A5 merged (#2–#7); A6 in flight |
| **B1. Foundation on Astro** | `v0.3` | scaffold graft, Supabase project + schema + RLS suite, auth, repos over `StorageAdapter`, layout, static pages | not started |
| **B2. Feature islands** | `v0.4` | dashboard, expenses, events, groups, friends, settlements, profile, currency, CSV | not started |
| **B3. Cutover** | `v0.5` | parity audit, PWA, `inceptor → main`, Firebase retirement (14-day window) | not started |
| **C. Upstream to Inceptor** | `v0.6 - Upstream to Inceptor` | Supabase-via-data-layer recipe, brownfield playbook, `init.mjs --into` | not started |
| **C'. Upstream to cybereco-hub** | `v0.6 - JustSplit consumer` | written consumer commitment, relational mode (`SchemaMap`), static example | not started (H2 gated on the hub's C1) |
| **D. Relationship kinds** | `v0.7 - Relationship kinds` | couple / household / friends / trip / project kinds, category taxonomy, conceptos, budget, recurring due list | post-cutover |

## Owner actions that gate the tracks

See [`SETUP.md`](./SETUP.md) §4: `GH_PACKAGES_TOKEN`, the Supabase project and
`SUPABASE_DB_URL`, `ANTHROPIC_API_KEY`, branch protection, the Hub deploy (gate
C1 for relational mode), Firebase retirement after cutover.

## Explicitly not planned

Supabase without the data layer; keeping Firebase; the `feat/nx-refactor`
monorepo branch as an input; per-group custom categories, period-close
entities, auto-generated recurring expenses (spec D9 "explicitly not built").
