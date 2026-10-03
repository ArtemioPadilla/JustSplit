#!/usr/bin/env node
/**
 * Which Cloudflare Pages branch a push deploys to (plan B20a, ADR 0016).
 *
 * The Pages project `justsplit` has `main` as its production branch, so a push
 * to `main` is the production deployment (served at split.cybere.co) and every
 * other branch is a preview (`<branch>.justsplit.pages.dev`).
 *
 * Why a script and not inline shell: the branch name is text a collaborator
 * chooses, and git allows `$`, `(`, `;`, backticks and `&` in a ref. It reaches
 * `wrangler pages deploy --branch=...`, so it is reduced to [A-Za-z0-9._/-]
 * here, where a unit test (`src/tests/pages-target.test.ts`) can pin it, and the
 * workflow reads the result from a step output instead of interpolating
 * `github.ref` into anything that is parsed.
 */
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PREFIX = 'refs/heads/';

/** `refs/heads/<name>` -> the Pages branch. Throws for anything that is not a branch ref. */
export function pagesBranch(ref) {
  if (typeof ref !== 'string' || !ref.startsWith(PREFIX) || ref.length === PREFIX.length) {
    throw new Error(`pages-target: "${ref}" is not a branch ref (refs/heads/...); only branch pushes deploy`);
  }
  const safe = ref.slice(PREFIX.length).replace(/[^A-Za-z0-9._/-]/g, '-');
  // A leading dash would be read as another option by the CLI that receives it.
  return safe.startsWith('-') ? `x${safe}` : safe;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const branch = pagesBranch(process.env.REF ?? '');
    const out = process.env.GITHUB_OUTPUT;
    if (out) appendFileSync(out, `branch=${branch}\n`);
    else console.log(branch);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
