# JustSplit docs — index

Start here. The repository is mid-migration onto the Inceptor scaffold and the
CyberEco data layer (ADR 0001); the two canonical documents are the spec and the
plan. Everything else is either the pre-migration product documentation (still
the source for *what* the product does) or historical.

| I want to… | Read |
|---|---|
| Understand the target architecture and every decision | [`superpowers/specs/2026-09-18-inceptor-migration-design.md`](./superpowers/specs/2026-09-18-inceptor-migration-design.md) (D1–D10, risks, parity checklist) |
| Pick up the next piece of work | [`superpowers/plans/2026-09-18-inceptor-migration.md`](./superpowers/plans/2026-09-18-inceptor-migration.md) (Tracks A–D, one issue per section) |
| Set up a checkout, secrets, workflows | [`../SETUP.md`](../SETUP.md) |
| See how agents and humans work here | [`../CLAUDE.md`](../CLAUDE.md), [`../.claude/agents/`](../.claude/agents/), [`../.claude/checklists/`](../.claude/checklists/) |
| Know why something irreversible was decided | [`decisions/`](./decisions/) (ADRs; `0001` adopts the workflow) |
| See where the product is going | [`../ROADMAP.md`](../ROADMAP.md) · [`../CHANGELOG.md`](../CHANGELOG.md) |
| Understand the product (features, stories, data model) | [`requirements/`](./requirements/) · [`api/data-models.md`](./api/data-models.md) · [`design/`](./design/) · [`JustSplit Consolidated Feature Matrix and Detailed Roadmap.markdown`](./JustSplit%20Consolidated%20Feature%20Matrix%20and%20Detailed%20Roadmap.markdown) |
| Understand the Next.js app being replaced | [`architecture/`](./architecture/) · [`development/`](./development/) (Next-era; superseded by the plan where they disagree) |

## Status of the older documents

- `known-bugs.md` — emptied into issues [#8](https://github.com/ArtemioPadilla/JustSplit/issues/8), [#9](https://github.com/ArtemioPadilla/JustSplit/issues/9), [#10](https://github.com/ArtemioPadilla/JustSplit/issues/10), [#11](https://github.com/ArtemioPadilla/JustSplit/issues/11); each names the plan issue that fixes it.
- `refactor-plan.md`, `development/assesment-202505.md` — **superseded** by the spec and plan (banner at the top of each).
- `planning/*`, `Short-Term Goals (Next 1-2 Weeks).md` — pre-migration planning; `ROADMAP.md` at the repo root is current.
- `development/firebase-deployment.md` — describes the retiring stack (spec D1); kept until B20 for the rollback window.
