import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

/**
 * Plan B2a: the deploying workflows build WITH the public Supabase config
 * (repository variables, never secrets); ci.yml builds WITHOUT it on purpose,
 * so every PR exercises the guarded `supabaseEnabled === false` path.
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

describe.each(['deploy.yml', 'deploy-staging.yml'])('%s (plan B2a)', (file) => {
  const { wf } = load(file);

  it('has a build step', () => {
    expect(buildSteps(wf)).toHaveLength(1);
  });

  it('passes both PUBLIC_SUPABASE_* values from repository variables', () => {
    const env = buildSteps(wf)[0]!.env ?? {};
    expect(env.PUBLIC_SUPABASE_URL).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_URL\s*\}\}$/);
    expect(env.PUBLIC_SUPABASE_KEY).toMatch(/^\$\{\{\s*vars\.PUBLIC_SUPABASE_KEY\s*\}\}$/);
  });

  it('takes the base path from the ASTRO_BASE variable with the project-pages fallback', () => {
    expect(buildSteps(wf)[0]!.env?.ASTRO_BASE).toMatch(/^\$\{\{\s*vars\.ASTRO_BASE\s*\|\|\s*'\/JustSplit'\s*\}\}$/);
  });
});

describe('deploy-staging.yml', () => {
  const { wf } = load('deploy-staging.yml');

  it('deploys the inceptor branch only', () => {
    expect(wf.on.push).toEqual({ branches: ['inceptor'] });
  });

  it('publishes with actions/deploy-pages to this repository (no gh-pages branch, no deploy key)', () => {
    const uses = steps(wf).map((s) => s.uses ?? '');
    expect(uses.some((u) => u.startsWith('actions/deploy-pages@'))).toBe(true);
    expect(uses.some((u) => /peaceiris|gh-pages|JamesIves/i.test(u))).toBe(false);
  });

  it('shares the pages concurrency group with deploy.yml', () => {
    const prod = load('deploy.yml').text;
    const group = (t: string) => /concurrency:\s*\n\s*group:\s*(\S+)/.exec(t)?.[1];
    expect(group(load('deploy-staging.yml').text)).toBe('pages');
    expect(group(prod)).toBe('pages');
  });
});

describe('ci.yml (plan B2a)', () => {
  it('builds without any PUBLIC_SUPABASE_* value', () => {
    expect(load('ci.yml').text).not.toMatch(/PUBLIC_SUPABASE_/);
  });
});
