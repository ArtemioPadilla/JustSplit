# JustSplit — Claude Code Context

## Repository purpose

Fair expense splitting made simple: track, divide and settle shared expenses
for couples, friends, households, trips and projects. Every change ships as:
GitHub issue → Claude triages → PR → merge → deploy (Issue-Driven Development,
adopted from **Inceptor**).

## Active migration — read this first

This repo is mid-migration (ADR 0001). The canonical documents are:

- **Spec**: `docs/superpowers/specs/2026-09-18-inceptor-migration-design.md`
  (decisions D1–D10)
- **Plan**: `docs/superpowers/plans/2026-09-18-inceptor-migration.md`
  (issues `A1`…`A6`, `B1`…`B22`, `C1`…`C3`, `H1`…`H3`, `D0`…`D12`)

Two trees coexist in the plan's timeline; check which one you are in:

| | `main` until cutover (Next, frozen) | `inceptor` branch → `main` at cutover (Astro, **this tree from B1**) |
|---|---|---|
| Framework | Next.js 15 App Router, React 18 | Astro 5 `output: 'static'` + React 19 islands |
| Styling | MUI 7 + CSS Modules | Tailwind v4 (`@tailwindcss/vite`) + shadcn on Base UI |
| Data / auth | Firebase Auth + Firestore (client SDK) | Supabase via `@cyber-eco/types` / `auth` / `supabase` behind `src/lib/data/` |
| State | React Context (`src/context/*`) | Nano Stores (session, prefs, toasts) + TanStack Query (data) |
| Tests | Jest + Testing Library | Vitest + Testing Library; RLS suite against `supabase start` |
| Hosting | Firebase Hosting (untouched until cutover) | GitHub Pages via Inceptor's `deploy.yml` |

`next.config.js` present ⇒ the frozen Next tree on `main` (no app-code changes there);
`astro.config.mjs` present ⇒ the Astro tree (Track B, PRs target `inceptor`).

## File organization

Now: `src/app/` (routes), `src/components/`, `src/context/`, `src/utils/`,
`src/firebase/`, `src/types/`, `src/__tests__/` + colocated `__tests__/`.

Target (spec §4): `src/pages/` (Astro shells, one route island each),
`src/components/{islands,ui,common,features}/`, `src/stores/`,
`src/lib/data/{client,adapter,schema-map,repos,hooks}/`, `src/schemas/`,
`src/domain/`, `supabase/migrations/` (dbmate), `docs/decisions/` (ADRs).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | dev server (4321 on the Astro tree; 4000 on the frozen Next tree) |
| `npm run check` | **the umbrella gate**: `astro check` + type-check + Vitest + ESLint + pragma check, then the production build and the `dist/` checks (`check:dist`, `check:auth-bundle`, `check:charts-bundle`, `check:budgets`) (`ship.sh`, `centinela`, `ci.yml` call it) |
| `npm run check:budgets` | the page-size budget gate (part of `check`): statically loaded gzipped JS per built page against `performance-budgets.json`. **Never raise a budget to absorb a regression**; `node scripts/check-budgets.mjs --report` prints the measurement (`SETUP.md`, "Performance budgets") |
| `npm run test` | Vitest (Jest on the frozen Next tree) |
| `npm run type-check` | `tsc --noEmit` |
| `npm run format` | Prettier |
| `npm run db:start` / `db:migrate` / `db:seed` | local Supabase stack + dbmate migrations + seed (`SETUP.md` §1) |
| `npm run test:rls` | the RLS suite against the local stack (its own CI job; never part of `check`) |
| `npm run check:a11y` | axe-core smoke against a production build (`dist/`, own CI step; never part of `check` — needs a real browser, see `scripts/axe-smoke.mjs`) |
| `npm run check:offline` | offline shell smoke: builds under `/JustSplit` into `dist-offline/`, lets the service worker install in Chromium, goes offline and asserts `/expenses/abc` gets the 404 shell, `/settlements/?event=x` and `/auth/callback/?code=x` their own pages, Supabase paths untouched (own CI step after `check:a11y`; never part of `check` — needs a real browser, see `scripts/offline-smoke.mjs`) |
| `npm run perf` | Lighthouse CI against the live staging URLs (`lhci collect && lhci assert`, `.lighthouserc.json`; by hand for B18, never in CI) |
| `npm run test:live` | live end-to-end smoke: builds the site against `supabase start`, signs in through the real form, walks the critical flows (asserting DB state) and runs axe + the 375px overflow check on every signed-in page state (own CI step in the `RLS & contract` job, after the suites that need the same stack; never part of `check` — needs Docker, the stack and a real browser, see `scripts/live-smoke.mjs`) |
| `npm run doctor` | preflight: node ≥ 22, gh auth, clean tree, branch naming, config present |
| `npm run monday` | open PRs, recent merges, top issues, local branches |
| `npm run ship` | `check` → push → open PR (refuses from `main` or a dirty tree) |

Slash commands `/doctor`, `/monday`, `/ship` wrap these (`.claude/commands/`).

## Conventions

- **Branch naming**: `phase-N/issue-<id>-short-slug` (e.g.
  `phase-0/issue-A3a-runnable-gate`); Track B PRs target the long-lived
  `inceptor` branch, everything else targets `main`.
- **Commits**: Conventional Commits + issue ref (`feat(islands): add
  ExpenseListIsland (#21)`); TDD trailers `Tdd-Red: <sha>` /
  `Tdd-Red-Verified: inline` on `tdd-tier:strict` issues.
- **PR title** = issue title; body includes `Closes #N` and the tiered ethics
  items from `.claude/checklists/ethics.md`.
- **Labels**: `phase-0`…`phase-4`, `type:chore|feat|docs`, `track:workflow`,
  `track:stack`, `risk:high`, `tdd-tier:strict|smoke|exempt`, `ai-approved`.
- **ADRs**: every irreversible decision is a file in `docs/decisions/`
  (template there). Numbering is sequential; the plan pre-assigns 0001–0011.

## Workflow: orchestration + sub-agents

The main Claude Code session is the orchestrator. Three sub-agents live under
`.claude/agents/`:

- **prometeo** — reads the plan and decomposes a track, milestone or issue
  into an ordered, dependency-aware execution plan. Writes no code.
- **forja** — implements one issue on its branch with atomic commits. Does
  not validate or open PRs.
- **centinela** — runs `npm run check`, the forbidden-import scan (changed
  files only until B1), the TDD trailer check and the ethics gate; returns
  `APPROVED` or `REJECTED` with a routing token (`RETRY_FORJA`,
  `NEEDS_HUMAN`, `BLOCKED_UPSTREAM`).

Kickoff is a plain request: "Land B5a from the migration plan — PR open
against `inceptor`, centinela APPROVED, branch named per the plan."
Track A issues up to A3a are run by the main session directly (the gate is
not runnable before A3a).

## Critical warnings — read before touching code

Inceptor's stack rules apply to every file written for the target tree (and
are enforced by `centinela` from B1 on the whole tree):

1. ❌ **NEVER install `@astrojs/tailwind`** — Tailwind v4 goes through
   `@tailwindcss/vite`.
2. ❌ **NEVER use React Context for state shared between islands** — partial
   hydration breaks it. Use Nano Stores. (The Next tree's `src/context/*` is
   legacy and is deleted in B1.)
3. ❌ **NEVER wrap the whole app in one `client:load` island.** One route
   island per page, `client:only="react"` with a fallback skeleton for
   authenticated pages.
4. ❌ **NEVER mix Radix and Base UI** in one component; prefer Base UI.
5. ❌ **NEVER import `@tremor/react`**; copy Tremor Raw.
6. ❌ **NEVER import `framer-motion`**; use `motion/react`.

Data-layer rules (spec D3, D10; from `cybereco-hub/docs/design/`):

7. ❌ **NEVER query `@supabase/supabase-js` directly from islands or stores.**
   Data goes through `src/lib/data/repos/*` over the `StorageAdapter`
   interface from `@cyber-eco/types`; the adapter is injected once in
   `src/lib/data/adapter.ts`.
8. ❌ **NEVER rely on client-side permission checks.** The client runs
   `permissions: { enabled: false }`; Postgres RLS is the only authorization.
   Every table the adapter touches has `ENABLE ROW LEVEL SECURITY` + policies,
   and the B2b suite proves member / non-member / anonymous outcomes.
9. ❌ **NEVER use document mode (`public.documents`) for shared data** — its
   RLS is owner-only, so every group row would be readable by every user.
   Relational mode via the SchemaMap, always.
10. ❌ **NEVER add a field named `extra` to a document.** JustSplit-only fields
    are flat top-level fields; the SchemaMap routes them into the `extra`
    overflow column. The app never sees the column.

The machine-readable list of banned imports is
`.claude/checklists/forbidden-imports.json` (enforced whole-tree by `centinela`
and `src/tests/forbidden-imports.test.ts` since B1).

## Auth gating rules

`src/lib/route-guard.tsx` (from Inceptor) is the only gating module in the
target tree: `<RouteGuard>`, `hasRole()`, `hasFlag()`.

- Permission checks are explicit allowlists / `=== true`, never `!== false`.
- Identity comes from the auth session (`@cyber-eco/auth` `<AuthProvider>` →
  the `$user` Nano Store), never from props, query params or the
  user-writable `profiles` row. `toGuardUser()` grants `roles: ['user']` from
  the session only.
- Deny by default: no user, unknown role or missing flag ⇒ blocked. The guard
  is UX; RLS is the enforcement.

## Quality bar

- Every PR passes `npm run check`; from B2b also the RLS/contract suite.
- New reusable widgets appear in `/showcase` (from B1).
- `risk:high` issues carry a Stakeholder Analysis ADR in `docs/decisions/`.
- No table without an RLS policy; no policy without a test.

## References

- Inceptor: <https://github.com/ArtemioPadilla/inceptor> (scaffold, agents,
  `docs/PRINCIPLES.md`, `docs/COMPONENTS.md`, recipes)
- CyberEco data layer: `cyber-eco/cybereco-hub` — `docs/adr/ADR-007`,
  `ADR-008`, `docs/design/permissions-rls-doctrine.md`,
  `docs/design/schema-map-strategy.md`, `docs/design/storage-adapter-contract.md`
- Product docs: `docs/requirements/`, `docs/design/`, `docs/planning/` (the
  pre-migration product documentation; the roadmap file is updated in A6)
