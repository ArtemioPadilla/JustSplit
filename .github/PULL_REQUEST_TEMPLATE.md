<!--
Skip the rest of this template only if your PR is tier-0:
   docs/**, *.md, *.mdx, or tests/** changes only.
Otherwise, fill out the sections below. See .claude/checklists/ethics.md for
the tier rubric and the full 8-item checklist.
-->

## Summary

<!-- What this PR does, in 1-3 sentences. Name the plan issue (A3a, B5a, …). -->

Closes #

## TDD evidence

<!-- For type:feat / type:fix only. Skip if tdd-tier:exempt or smoke. -->

- [ ] A failing `test(...)` commit precedes the first `feat(`/`fix(` commit
- [ ] The green commit carries a `Tdd-Red: <sha>` trailer (or `Tdd-Red-Verified: inline`)

## Ethics & UX checklist

<!--
Required items for the tier (canonical source: .claude/checklists/ethics.json).
N/A is fine for non-required items with a one-line reason.
-->

**1. Intent declared** *(required at every non-zero tier)*
> What behavior change does this PR push the user toward, and whose benefit?

**2. No deception, no coercion** *(required at tier 2)*

**3. Asymmetric persistence justified**

**4. Borrowed credibility honest**

**5. Emotional cues reciprocal**

**6. Surveillance overt and supportive** *(required at tier 2)*

**7. Vulnerable-group impact considered** *(required at every non-zero tier)*

**8. Unintended-but-predictable outcomes named** *(required at every non-zero tier)*

## Mechanical checks

- [ ] `npm run check` passes
- [ ] Every new table or policy has a case in the RLS suite *(from B2b)*
