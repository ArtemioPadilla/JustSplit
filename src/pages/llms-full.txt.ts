import type { APIRoute } from 'astro';
import { SITE, REPO_URL } from '@/lib/site-meta';

/**
 * /llms-full.txt — the repo's key documents, listed for one-request ingestion.
 * JustSplit has no docs content collection (Inceptor's version concatenates
 * one); this static list points at the canonical files on GitHub instead.
 */
const DOCS = [
  ['CLAUDE.md', 'Agent guardrails, stack rules, workflow'],
  ['SETUP.md', 'Checkout, secrets, workflows, owner-actions log'],
  ['ROADMAP.md', 'Tracks, milestones, status'],
  ['docs/INDEX.md', 'Where everything lives'],
  ['docs/superpowers/specs/2026-09-18-inceptor-migration-design.md', 'Design spec (decisions D1–D10)'],
  ['docs/superpowers/plans/2026-09-18-inceptor-migration.md', 'Execution plan (one issue per section)'],
  ['docs/decisions/', 'Architecture decision records'],
] as const;

export const GET: APIRoute = () => {
  const body = `# ${SITE.name} — full documentation

> ${SITE.description}

Source: ${REPO_URL} (${SITE.license}).

${DOCS.map(([path, what]) => `- [${path}](${REPO_URL}/blob/main/${path}) — ${what}`).join('\n')}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
