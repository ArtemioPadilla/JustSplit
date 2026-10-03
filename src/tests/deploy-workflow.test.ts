import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/**
 * Plan B20a (ADR 0016, supersedes spec D2's GitHub Pages): ONE deploy
 * definition, `deploy.yml`, publishes to the Cloudflare Pages project
 * `justsplit` with `wrangler pages deploy`. These tests pin the properties that
 * make it safe to hold production credentials in a public repository:
 *
 *  - it cannot run on its own: it is a reusable workflow `ci.yml` calls with
 *    `needs: [build, rls]`, so a red commit is never deployed (a `workflow_run`
 *    trigger would only run from the default branch's copy of the file, which
 *    until the cutover is the frozen Next tree, so `inceptor` previews would
 *    never fire);
 *  - pushes only: a pull request (and so a fork) never reaches a secret, and
 *    `pull_request_target` appears nowhere;
 *  - exactly two secrets (Cloudflare), handed to the wrangler action as inputs
 *    and never to a shell; the public Supabase pair comes from `vars`;
 *  - `main` is the production branch of the Pages project, every other branch
 *    is a preview, the branch name never reaches a shell unsanitised.
 */
interface Step {
  name?: string;
  id?: string;
  uses?: string;
  run?: string;
  if?: string;
  env?: Record<string, string>;
  with?: Record<string, string>;
}
interface Job {
  name?: string;
  needs?: string | string[];
  if?: string;
  uses?: string;
  secrets?: Record<string, string> | string;
  permissions?: Record<string, string> | string;
  steps?: Step[];
}
interface Workflow {
  on: Record<string, unknown>;
  permissions?: Record<string, string> | string;
  concurrency?: { group: string; 'cancel-in-progress'?: boolean | string };
  jobs: Record<string, Job>;
}

const DIR = resolve(__dirname, '../../.github/workflows');
const files = readdirSync(DIR).filter((f) => f.endsWith('.yml'));
const text = (f: string) => readFileSync(resolve(DIR, f), 'utf8');
const load = (f: string) => parse(text(f)) as Workflow;
const deploy = load('deploy.yml');
const ci = load('ci.yml');
const steps = (wf: Workflow) => Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
const needsOf = (job: Job) => [job.needs ?? []].flat();

describe('one Cloudflare Pages deploy (plan B20a, ADR 0016)', () => {
  it('the GitHub Pages workflows are gone: deploy.yml is the only deploy, there is no staging workflow', () => {
    expect(existsSync(resolve(DIR, 'deploy-staging.yml'))).toBe(false);
    for (const f of files) {
      expect(text(f), f).not.toMatch(/actions\/(deploy-pages|upload-pages-artifact|configure-pages)/);
      expect(text(f), f).not.toMatch(/^\s*pages:\s*write/m);
    }
    // id-token: write was GitHub Pages' OIDC deploy grant; claude.yml's own use is unrelated
    for (const f of ['ci.yml', 'deploy.yml', 'db-migrate.yml']) expect(text(f), f).not.toMatch(/^\s*id-token:\s*write/m);
    expect(files.filter((f) => /cloudflare\/wrangler-action/.test(text(f)))).toEqual(['deploy.yml']);
  });

  it('publishes with a SHA-pinned wrangler-action at a pinned wrangler version', () => {
    const step = steps(deploy).find((s) => s.uses?.startsWith('cloudflare/wrangler-action@'));
    expect(step, 'a cloudflare/wrangler-action step').toBeTruthy();
    expect(step!.uses).toMatch(/^cloudflare\/wrangler-action@[0-9a-f]{40}$/);
    expect(step!.with?.wranglerVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(step!.with?.command).toMatch(/^pages deploy dist\b/);
    expect(step!.with?.command).toMatch(/--project-name=justsplit\b/);
  });

  it('never runs on its own: a reusable workflow, no push/pull_request/dispatch/workflow_run trigger', () => {
    expect(Object.keys(deploy.on)).toEqual(['workflow_call']);
  });

  it('is called from ci.yml only after Build & Check and RLS & contract pass, on pushes only', () => {
    const job = ci.jobs.deploy;
    expect(job, 'a `deploy` job in ci.yml').toBeTruthy();
    expect(job!.uses).toBe('./.github/workflows/deploy.yml');
    expect(needsOf(job!).sort()).toEqual(['build', 'rls']);
    expect(ci.jobs.build!.name).toBe('Build & Check');
    expect(ci.jobs.rls!.name).toBe('RLS & contract (supabase start)');
    // push, never pull_request: a PR (and every fork PR) cannot reach a secret
    expect(job!.if).toMatch(/github\.event_name\s*==\s*'push'/);
    expect(job!.if).not.toMatch(/pull_request/);
    // no `always()` / `!cancelled()`: a skipped or failed dependency must skip the deploy
    expect(job!.if).not.toMatch(/always\(\)|cancelled\(\)|failure\(\)/);
  });

  it('hands over the two Cloudflare secrets by name (never `secrets: inherit`)', () => {
    const job = ci.jobs.deploy!;
    expect(job.secrets).toEqual({
      CLOUDFLARE_API_TOKEN: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
      CLOUDFLARE_ACCOUNT_ID: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
    });
    expect(ci.jobs.deploy!.secrets).not.toBe('inherit');
    expect(parse(text('deploy.yml')).on.workflow_call.secrets).toEqual({
      CLOUDFLARE_API_TOKEN: { required: true },
      CLOUDFLARE_ACCOUNT_ID: { required: true },
    });
  });

  it('uses no other secret, and never puts one in a shell step or an env block', () => {
    const used = new Set([...text('deploy.yml').matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]));
    expect(used).toEqual(new Set(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']));
    for (const step of steps(deploy)) {
      if (step.run !== undefined) expect(JSON.stringify(step), step.name).not.toMatch(/secrets\./);
      if (!step.uses?.startsWith('cloudflare/wrangler-action@')) expect(JSON.stringify(step.env ?? {}), step.name).not.toMatch(/secrets\./);
    }
    // the credentials are action inputs, which the action masks
    const wrangler = steps(deploy).find((s) => s.uses?.startsWith('cloudflare/wrangler-action@'))!;
    expect(wrangler.with?.apiToken).toBe('${{ secrets.CLOUDFLARE_API_TOKEN }}');
    expect(wrangler.with?.accountId).toBe('${{ secrets.CLOUDFLARE_ACCOUNT_ID }}');
    expect(text('deploy.yml')).not.toMatch(/\becho\b[^\n]*(secrets\.|TOKEN)/i);
    // the wrangler action may call the GitHub API only with a token it is handed: it is not
    expect(wrangler.with).not.toHaveProperty('gitHubToken');
  });

  it('builds with the public Supabase pair from repository VARIABLES, and no base path', () => {
    const build = steps(deploy).find((s) => /\bnpm run build\b/.test(s.run ?? ''));
    expect(build, 'a build step').toBeTruthy();
    expect(build!.env?.PUBLIC_SUPABASE_URL).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_URL\s*\}\}$/);
    expect(build!.env?.PUBLIC_SUPABASE_KEY).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_KEY\s*\}\}$/);
    expect(text('deploy.yml')).not.toMatch(/secrets\.PUBLIC_/);
    // production is served from the root: ASTRO_BASE is not a variable any more (ADR 0016)
    expect(text('deploy.yml')).not.toMatch(/ASTRO_BASE/);
  });

  it('passes the Google sign-in flag as a repository VARIABLE, never a secret (plan B20a)', () => {
    const build = steps(deploy).find((s) => /\bnpm run build\b/.test(s.run ?? ''))!;
    expect(build.env?.PUBLIC_AUTH_GOOGLE).toMatch(/^\$\{\{\s*vars\.PUBLIC_AUTH_GOOGLE\s*\}\}$/);
    expect(text('deploy.yml')).not.toMatch(/secrets\.PUBLIC_AUTH/);
  });

  it('fails fast, without printing a value, when the public config variables are missing', () => {
    const guard = steps(deploy).find((s) => /PUBLIC_SUPABASE_URL/.test(s.run ?? ''));
    expect(guard, 'a guard step that checks the variables').toBeTruthy();
    expect(guard!.run).toMatch(/exit 1/);
    expect(guard!.run).not.toMatch(/echo[^\n]*\$\{?PUBLIC_SUPABASE_(URL|KEY)/);
  });

  it('maps main to the production branch and every other branch to a preview, through a sanitising script', () => {
    const target = steps(deploy).find((s) => (s.run ?? '').includes('scripts/pages-target.mjs'));
    expect(target, 'a step that runs scripts/pages-target.mjs').toBeTruthy();
    expect(target!.id).toBe('target');
    // the ref reaches the script through env, not by interpolation into the shell
    expect(target!.env?.REF).toBe('${{ github.ref }}');
    expect(target!.run).not.toMatch(/\$\{\{/);
    const wrangler = steps(deploy).find((s) => s.uses?.startsWith('cloudflare/wrangler-action@'))!;
    expect(wrangler.with?.command).toMatch(/--branch=\$\{\{\s*steps\.target\.outputs\.branch\s*\}\}/);
    expect(wrangler.with?.command).not.toMatch(/github\.(ref|head_ref|ref_name)/);
  });

  it('hardening: least-privilege permissions, a concurrency group per branch, Node 22', () => {
    expect(deploy.permissions).toEqual({ contents: 'read' });
    expect(ci.permissions).toEqual({ contents: 'read' });
    // the caller may not grant what the callee does not need
    expect(ci.jobs.deploy!.permissions ?? { contents: 'read' }).toEqual({ contents: 'read' });
    expect(deploy.concurrency?.group).toMatch(/github\.ref\b/);
    // production deploys queue, previews are superseded by the next push
    expect(String(deploy.concurrency?.['cancel-in-progress'])).toMatch(/github\.ref\s*!=\s*'refs\/heads\/main'/);
    const node = steps(deploy).find((s) => s.uses?.startsWith('actions/setup-node@'));
    expect(node?.with?.['node-version']).toBe('22');
  });

  it('skips the deploy on a fork: the job is guarded by the repository', () => {
    expect(ci.jobs.deploy!.if).toMatch(/github\.repository\s*==\s*'ArtemioPadilla\/JustSplit'/);
  });
});

describe('workflow safety, whole directory', () => {
  it('no workflow is triggered by pull_request_target', () => {
    for (const f of files) {
      expect(Object.keys(load(f).on ?? {}), f).not.toContain('pull_request_target');
    }
  });

  it('every action outside actions/* and github/* is SHA-pinned', () => {
    for (const f of files) {
      // Only real step lines (`uses:` at a key position), not comment text that quotes `uses:`.
      const uses = [...text(f).matchAll(/^\s*-?\s*uses:\s+([^\s#]+)/gm)].map((m) => m[1]!);
      for (const ref of uses) {
        if (/^(actions|github)\//.test(ref) || ref.startsWith('./')) continue;
        expect(ref, `${f}: ${ref}`).toMatch(/@[0-9a-f]{40}$/);
      }
    }
  });

  it('ASTRO_BASE falls back to nothing in any workflow: the base is `/` by default', () => {
    for (const f of files) expect(text(f), f).not.toMatch(/'\/JustSplit'/);
  });
});
