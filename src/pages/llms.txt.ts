import type { APIRoute } from 'astro';
import { SITE, REPO_URL } from '@/lib/site-meta';

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

- [Home](/): landing page (the app's authenticated routes arrive with Track B of the migration plan)

## For agents

- Design spec: ${REPO_URL}/blob/main/docs/superpowers/specs/2026-09-18-inceptor-migration-design.md
- Execution plan: ${REPO_URL}/blob/main/docs/superpowers/plans/2026-09-18-inceptor-migration.md
- Full docs as one file: /llms-full.txt
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
