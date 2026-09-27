# Governance checklist (single source)

The baseline every Inceptor-derived repo should satisfy — adopted by JustSplit
in Track A (ADR 0001). `prometeo` reads this on its governance pre-check;
humans use it during repo setup. Mirrors Inceptor's `docs/PRINCIPLES.md` §6.

## Files present at the repo root / `.github/`

- [ ] `LICENSE` — present (verify the license text matches the README claim)
- [ ] `SECURITY.md` — disclosure policy + no-penalty pledge (A6)
- [ ] `CODE_OF_CONDUCT.md` — Contributor Covenant reference (A6)
- [ ] `.github/dependabot.yml` — GitHub Actions block in A5; npm block in B1
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — TDD evidence + tiered 8-item ethics checklist (A5)
- [ ] `.github/CODEOWNERS` — default owner (A5)

## Branch protection on `main` (configure once per repo)

Configured after the first green run of `ci.yml` (A3b): Settings → Branches →
`main` (and `inceptor` for the life of Track B).

- [ ] Require a PR before merging (no direct pushes)
- [ ] Required status checks: `Build & Check` (the `ci.yml` job name; B2b adds
      `RLS & contract (supabase start)`)
- [ ] Linear history (squash-merge)
- [ ] Signed commits (`required_signatures`)
- [ ] Dismiss stale reviews; require code-owner review

## Per-PR gates (enforced by the PR template + centinela)

- [ ] Tier-appropriate ethics items answered (see `.claude/checklists/ethics.json`)
- [ ] TDD evidence: `Tdd-Red:` trailer or `Tdd-Red-Verified: inline`
- [ ] `risk:high` triggers → Stakeholder Analysis ADR in `docs/decisions/`
- [ ] No forbidden imports (see `.claude/checklists/forbidden-imports.json`)
