import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/**
 * Plan B2a: the deploying workflow builds WITH the public Supabase config
 * (repository variables, never secrets); ci.yml builds WITHOUT it on purpose,
 * so every PR exercises the guarded `supabaseEnabled === false` path. The
 * deploy topology itself (Cloudflare Pages, plan B20a) is pinned in
 * `deploy-workflow.test.ts`.
 */
interface Step {
  run?: string;
  uses?: string;
  env?: Record<string, string>;
}
interface Workflow {
  on: Record<string, unknown>;
  jobs: Record<string, { steps?: Step[] }>;
}

const DIR = resolve(__dirname, '../../.github/workflows');
const load = (f: string) => ({ text: readFileSync(resolve(DIR, f), 'utf8'), wf: parse(readFileSync(resolve(DIR, f), 'utf8')) as Workflow });
const steps = (wf: Workflow) => Object.values(wf.jobs).flatMap((j) => j.steps ?? []);
const buildSteps = (wf: Workflow) => steps(wf).filter((s) => /\bnpm run (build|check)\b/.test(s.run ?? ''));

describe('deploy.yml (plan B2a, B20a)', () => {
  const { wf } = load('deploy.yml');

  it('has a build step', () => {
    expect(buildSteps(wf)).toHaveLength(1);
  });

  it('passes both PUBLIC_SUPABASE_* values from repository variables', () => {
    const env = buildSteps(wf)[0]!.env ?? {};
    expect(env.PUBLIC_SUPABASE_URL).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_URL\s*\}\}$/);
    expect(env.PUBLIC_SUPABASE_KEY).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_KEY\s*\}\}$/);
  });

  it('sets no ASTRO_BASE: production is served from the root of split.cybere.co (ADR 0016)', () => {
    expect(buildSteps(wf)[0]!.env).not.toHaveProperty('ASTRO_BASE');
  });
});

describe('ci.yml (plan B2a)', () => {
  it('builds without any PUBLIC_SUPABASE_* value', () => {
    expect(load('ci.yml').text).not.toMatch(/PUBLIC_SUPABASE_/);
  });
});

/**
 * Plan A7: the live smoke (`npm run test:live`) is a step of the existing
 * "RLS & contract (supabase start)" job, reusing its stack. Its build gets the
 * stack's keys from `supabase status` INSIDE `scripts/live-smoke.mjs`, so the
 * workflow never names a `PUBLIC_SUPABASE_*` variable or a secret (the
 * `ci.yml` assertion above keeps holding), and it is never part of `check`.
 */
describe('ci.yml live smoke (plan A7)', () => {
  interface JobStep extends Step {
    name?: string;
    if?: string;
  }
  const { text, wf } = load('ci.yml');
  const rls = (wf.jobs as unknown as Record<string, { steps: JobStep[] }>).rls!;
  const runs = (needle: string) => rls.steps.findIndex((s) => (s.run ?? '').includes(needle));

  it('runs after the stack is up and migrated, and after the RLS and contract suites', () => {
    const live = runs('npm run test:live');
    expect(live).toBeGreaterThan(-1);
    expect(runs('npm run db:start')).toBeGreaterThan(-1);
    for (const earlier of ['npm run db:start', 'npm run db:migrate', 'npm run test:rls', 'npm run test:contract:live']) {
      expect(runs(earlier), earlier).toBeLessThan(live);
    }
  });

  it('installs Chromium in that job first, the way the Build job does', () => {
    const install = runs('npx playwright-core install --with-deps chromium');
    expect(install).toBeGreaterThan(-1);
    expect(install).toBeLessThan(runs('npm run test:live'));
  });

  it('passes no secret and no public Supabase variable to the smoke (keys come from `supabase status`)', () => {
    const step = rls.steps[runs('npm run test:live')]!;
    expect(step.env).toBeUndefined();
    expect(text).not.toMatch(/PUBLIC_SUPABASE_/);
    // The only secret in ci.yml is the package-registry token used by `npm ci`.
    const secrets = [...text.matchAll(/secrets\.([A-Z_]+)/g)].map((m) => m[1]);
    expect(new Set(secrets)).toEqual(new Set(['GH_PACKAGES_TOKEN']));
  });

  it('still stops the stack last, even when the smoke fails', () => {
    const last = rls.steps[rls.steps.length - 1]!;
    expect(last.run).toBe('npm run db:stop');
    expect(last.if).toBe('always()');
  });

  it('is its own npm script and is never part of `npm run check`', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['test:live']).toBe('node scripts/live-smoke.mjs');
    expect(pkg.scripts.check).not.toMatch(/test:live|live-smoke/);
  });
});
