import type { APIRoute } from 'astro';
import { SITE, REPO_URL } from '@/lib/site-meta';
import { withBase } from '@/lib/href';

/**
 * /llms.txt — agent-first index (llmstxt.org). Keep this in sync as routes
 * grow; an agent reads this before crawling anything else.
 */
export const GET: APIRoute = () => {
  const body = `# ${SITE.name}

> ${SITE.description}

Source: ${REPO_URL} (${SITE.license}). Agent/contributor context:
${REPO_URL}/blob/main/CLAUDE.md

## Pages

- [Landing](${withBase('/landing')}): marketing home page — plan and pitch (plan B7)
- [About](${withBase('/about')}): mission and how it works (plan B7)
- [Help](${withBase('/help')}): FAQ and support topics (plan B7)
- [Home](${withBase('/')}): today a placeholder shell; the real authenticated dashboard arrives with Track B Phase 2

## For agents

- Design spec: ${REPO_URL}/blob/main/docs/superpowers/specs/2026-09-18-inceptor-migration-design.md
- Execution plan: ${REPO_URL}/blob/main/docs/superpowers/plans/2026-09-18-inceptor-migration.md
- Full docs as one file: /llms-full.txt
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
