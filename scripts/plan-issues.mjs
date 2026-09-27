#!/usr/bin/env node
// plan-issues.mjs — creates labels, milestones and GitHub issues FROM the migration plan.
//
// The plan (docs/superpowers/plans/2026-09-18-inceptor-migration.md) is the single source
// of truth: every `### <id>. <title>` section becomes one issue whose body is that section,
// so the two never drift. Idempotent: existing labels/milestones/issues (matched by name /
// exact title) are skipped. Dry run by default.
//
//   node scripts/plan-issues.mjs                       # dry run, this repo, tracks A+B
//   node scripts/plan-issues.mjs --apply               # create everything for this repo
//   node scripts/plan-issues.mjs --apply --issues-only # skip labels + milestones
//   node scripts/plan-issues.mjs --repo ArtemioPadilla/inceptor --apply     # Track C  (C1–C3)
//   node scripts/plan-issues.mjs --repo cyber-eco/cybereco-hub --apply      # Track C' (H1–H3)
//   node scripts/plan-issues.mjs --track d --apply     # Track D (D2–D12; D0/D1 are filed by hand)
//   node scripts/plan-issues.mjs --json                # print the parsed issues, create nothing
//
// Requires the GitHub CLI (`gh`) authenticated with access to the target repo.
import { readFileSync, writeSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PLAN_PATH = 'docs/superpowers/plans/2026-09-18-inceptor-migration.md';
const PLAN_URL = `https://github.com/ArtemioPadilla/JustSplit/blob/main/${PLAN_PATH}`;
const THIS_REPO = 'ArtemioPadilla/JustSplit';

// ---------------------------------------------------------------- args
const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
if (flag('help') || flag('h')) { console.log(readFileSync(new URL(import.meta.url)).toString().split('\n').slice(1, 16).join('\n')); process.exit(0); }
const APPLY = flag('apply');
const ISSUES_ONLY = flag('issues-only');
const JSON_ONLY = flag('json');
const repoArg = opt('repo');
const trackArg = opt('track')?.toLowerCase();

// ---------------------------------------------------------------- plan model
const MILESTONES = {
  'v0.2 - Inceptor workflow': 'Track A — adopt the Inceptor workflow (CLAUDE.md, sub-agents, CI gate, templates); no app code changes',
  'v0.3 - Foundation on Astro': 'Track B phase 1 — scaffold, Supabase via @cyber-eco, schema + RLS, auth, repos, layout, static pages',
  'v0.4 - Feature islands': 'Track B phase 2 — one island per route: dashboard, expenses, events, groups, friends, settlements, profile',
  'v0.5 - Cutover': 'Track B phase 3 — parity audit, PWA, cutover PR inceptor → main, Firebase retirement',
  'v0.6 - Upstream to Inceptor': 'Track C — recipes and init.mjs fixes upstreamed to the Inceptor scaffold',
  'v0.6 - JustSplit consumer': "Track C' — JustSplit as the committed consumer of @cyber-eco/supabase relational mode (ADR-008 gate)",
  'v0.7 - Relationship kinds': 'Track D (post-cutover) — relationship kinds, category taxonomy, conceptos, budgets, recurring due list',
};
const LABELS = {
  'phase-0': '6E6E6E', 'phase-1': '0E8A16', 'phase-2': '1D76DB', 'phase-3': '5319E7', 'phase-4': 'B60205',
  'type:chore': 'C5DEF5', 'type:feat': 'A2EEEF', 'type:docs': 'D4C5F9',
  'track:workflow': 'BFD4F2', 'track:stack': 'C2E0C6', 'risk:high': 'B60205',
  'ai-approved': '0E8A16', 'bug': 'D73A4A', 'enhancement': 'A2EEEF', 'question': 'D876E3',
  'tdd-tier:strict': 'FBCA04', 'tdd-tier:smoke': 'FEF2C0', 'tdd-tier:exempt': 'EEEEEE',
};
// type per id where the title does not make it obvious (default: type:feat)
const TYPE = {
  A1: 'chore', A2: 'docs', A3a: 'chore', A3b: 'chore', A4: 'docs', A5: 'chore', A6: 'docs',
  B1: 'chore', B2a: 'chore', B2: 'chore', B2b: 'chore', B3: 'feat', B18: 'chore', B20: 'chore', B21: 'chore', B22: 'chore',
  C1: 'docs', C2: 'docs', C3: 'feat', H1: 'docs', H2: 'feat', H3: 'feat', D12: 'docs',
};
const TDD_STRICT = new Set(['D1', 'D2', 'D7']);
const TRACK_OF = (id) => id[0].toLowerCase();
const REPO_OF_TRACK = { a: THIS_REPO, b: THIS_REPO, c: 'ArtemioPadilla/inceptor', h: 'cyber-eco/cybereco-hub', d: THIS_REPO };

function slug(heading) {
  // GitHub's heading anchor: lowercase, strip everything but word chars, spaces and hyphens, spaces → '-'
  return heading.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
}

export function parsePlan(text) {
  const lines = text.split('\n');
  const issues = [];
  let phase = null;
  for (let i = 0; i < lines.length; i++) {
    const ph = lines[i].match(/^### Phase (\d) — /);
    if (ph) { phase = Number(ph[1]); continue; }
    const m = lines[i].match(/^### ([ABCHD]\d+[a-z]?)\. (.+)$/);
    if (!m) continue;
    const [, id, rawTitle] = m;
    let j = i + 1;
    while (j < lines.length && !/^##/.test(lines[j])) j++;
    const body = lines.slice(i + 1, j).join('\n').trim();
    // trailing "(`risk:high`, `tdd-tier:strict`, …)" → labels; keep the rest of the title
    const tags = [];
    // any trailing parenthetical that carries at least one backticked tag, e.g. "(`risk:high`, blocks B3/B5a)"
    const title = rawTitle.replace(/\s*\(([^()]*`[^`]+`[^()]*)\)\s*$/, (_, g) => {
      for (const t of g.match(/`[^`]+`/g)) tags.push(t.slice(1, -1));
      return '';
    }).trim();
    const track = TRACK_OF(id);
    const labels = new Set();
    let milestone;
    if (track === 'a') { labels.add('phase-0').add('track:workflow'); milestone = 'v0.2 - Inceptor workflow'; }
    if (track === 'b') {
      labels.add(`phase-${phase}`).add('track:stack');
      milestone = { 1: 'v0.3 - Foundation on Astro', 2: 'v0.4 - Feature islands', 3: 'v0.5 - Cutover' }[phase];
      if (tags.includes('v0.3')) milestone = 'v0.3 - Foundation on Astro';
    }
    if (track === 'c') milestone = 'v0.6 - Upstream to Inceptor';
    if (track === 'h') milestone = 'v0.6 - JustSplit consumer';
    if (track === 'd') { labels.add('phase-4').add('track:stack'); milestone = 'v0.7 - Relationship kinds'; }
    if (track !== 'h') labels.add(`type:${TYPE[id] ?? 'feat'}`);
    for (const t of tags) if (t === 'risk:high' || t.startsWith('tdd-tier:')) labels.add(t);
    if (TDD_STRICT.has(id)) labels.add('tdd-tier:strict');
    if (track === 'h') labels.clear(); // the hub keeps its own label scheme
    issues.push({
      id, track, title: `${id}: ${title}`, milestone, labels: [...labels], repo: REPO_OF_TRACK[track],
      anchor: slug(`${id}. ${rawTitle}`), body,
    });
  }
  return issues;
}

function issueBody(it) {
  return `> Source of truth: [\`${PLAN_PATH}\` § ${it.id}](${PLAN_URL}#${it.anchor}). This body is a copy of that section at filing time; the plan wins if they drift.

${it.body}

## Workflow

Ask Claude Code: **"Land ${it.id} from the migration plan"** — prometeo plans, forja implements on \`phase-N/issue-${it.id}-<slug>\`, centinela validates (\`npm run check\`), then a PR with \`Closes #<this issue>\`.`;
}

// ---------------------------------------------------------------- gh helpers
const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const ghJson = (...a) => JSON.parse(gh(...a) || 'null');

function ensureLabel(repo, name, color) {
  const have = ghJson('label', 'list', '--repo', repo, '--limit', '300', '--json', 'name').map((l) => l.name);
  if (have.includes(name)) return console.log(`  · label exists: ${name}`);
  if (APPLY) gh('label', 'create', name, '--repo', repo, '--color', color, '--description', 'Created by scripts/plan-issues.mjs from the migration plan');
  console.log(`  + label: ${name} (#${color})`);
}
function ensureMilestone(repo, title) {
  const all = ghJson('api', `repos/${repo}/milestones?state=all&per_page=100`);
  const found = all.find((m) => m.title === title);
  if (found) return console.log(`  · milestone exists: ${title} (#${found.number})`);
  if (APPLY) gh('api', `repos/${repo}/milestones`, '-f', `title=${title}`, '-f', `description=${MILESTONES[title]}`, '-f', 'state=open');
  console.log(`  + milestone: ${title}`);
}
function ensureIssue(repo, it) {
  const existing = ghJson('issue', 'list', '--repo', repo, '--state', 'all', '--limit', '500', '--search', `in:title "${it.id}:"`, '--json', 'title');
  if (existing.some((e) => e.title === it.title || e.title.startsWith(`${it.id}: `))) return console.log(`  · issue exists: ${it.title}`);
  if (APPLY) {
    const a = ['issue', 'create', '--repo', repo, '--title', it.title, '--body', issueBody(it), '--milestone', it.milestone];
    if (it.labels.length) a.push('--label', it.labels.join(','));
    gh(...a);
  }
  console.log(`  + issue: ${it.title}  [${it.labels.join(' ')}]  → ${it.milestone}`);
}

// ---------------------------------------------------------------- main
const all = parsePlan(readFileSync(PLAN_PATH, 'utf8'));
const repo = repoArg ?? (JSON_ONLY ? THIS_REPO : gh('repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'));
let tracks;
if (trackArg) tracks = [trackArg];
else if (repo === THIS_REPO) tracks = ['a', 'b'];
else tracks = [...new Set(all.filter((i) => i.repo === repo).map((i) => i.track))];
let selected = all.filter((i) => tracks.includes(i.track) && i.repo === repo);
if (tracks.includes('d')) selected = selected.filter((i) => !['D0', 'D1'].includes(i.id)); // filed by hand (plan §Milestones)

if (JSON_ONLY) { writeSync(1, JSON.stringify(selected, null, 2) + '\n'); process.exit(0); } // writeSync: console.log to a pipe is async and would be cut by exit()

console.log(`Target repo: ${repo}   tracks: ${tracks.join(',')}   issues: ${selected.length}`);
if (!APPLY) console.log('[DRY RUN — pass --apply to actually create things]');
if (!ISSUES_ONLY) {
  console.log('\n==> Labels');
  if (repo === THIS_REPO) for (const [n, c] of Object.entries(LABELS)) ensureLabel(repo, n, c);
  else for (const n of new Set(selected.flatMap((i) => i.labels))) ensureLabel(repo, n, LABELS[n] ?? 'EDEDED');
  console.log('\n==> Milestones');
  for (const m of new Set(selected.map((i) => i.milestone))) ensureMilestone(repo, m);
}
console.log('\n==> Issues');
for (const it of selected) ensureIssue(repo, it);
console.log(`\n✅ Done (${selected.length} issues${APPLY ? '' : ', dry run'}).`);
