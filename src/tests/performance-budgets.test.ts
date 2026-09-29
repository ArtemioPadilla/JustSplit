import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plan B19: `performance-budgets.json` is the single source of the page-size
 * budgets `scripts/check-budgets.mjs` enforces on every PR (a hard gate inside
 * `npm run check`). This pins its shape and the policy around it; the numbers
 * themselves are set from a measurement after the reductions, with ~5% headroom,
 * and are never raised to absorb a regression (SETUP.md, "Performance budgets").
 */
const ROOT = resolve(__dirname, '../..');
const budgets = JSON.parse(readFileSync(resolve(ROOT, 'performance-budgets.json'), 'utf8')) as {
  groups: Record<
    string,
    {
      '//': string;
      pages: string[];
      maxStaticJsGzKb: number;
      maxTotalGzKb?: number;
      dominantChunk: string;
      overrides?: Record<string, number>;
    }
  >;
};
const LIB = pathToFileURL(resolve(ROOT, 'scripts/lib/bundle-graph.mjs')).href;
const groupsFor = async (route: string) =>
  ((await import(/* @vite-ignore */ LIB)) as { groupsFor: (r: string, b: unknown) => string[] }).groupsFor(route, budgets);

describe('performance-budgets.json', () => {
  it('has one group per path family: marketing, auth, app pages, and the showcase gallery', () => {
    expect(Object.keys(budgets.groups).sort()).toEqual(['app', 'auth', 'marketing', 'showcase']);
  });

  it('keeps the marketing pages at the existing 40 kB layout JS and 150 kB total', () => {
    const marketing = budgets.groups.marketing;
    expect(marketing.pages.sort()).toEqual(['/about', '/help', '/landing']);
    expect(marketing.maxStaticJsGzKb).toBe(40);
    expect(marketing.maxTotalGzKb).toBe(150);
  });

  it('gives every budget a comment that names the chunk dominating it', () => {
    for (const [name, group] of Object.entries(budgets.groups)) {
      expect(group.dominantChunk, name).toBeTruthy();
      expect(group['//'], name).toContain(group.dominantChunk);
      expect(group['//'].length, name).toBeGreaterThan(60);
    }
  });

  it('covers every route family exactly once', async () => {
    const owner: Record<string, string> = {
      '/landing/': 'marketing',
      '/about/': 'marketing',
      '/help/': 'marketing',
      '/auth/signin/': 'auth',
      '/auth/signup/': 'auth',
      '/auth/callback/': 'auth',
      '/auth/reset-password/': 'auth',
      '/': 'app',
      '/expenses/': 'app',
      '/expenses/list/': 'app',
      '/expenses/new/': 'app',
      '/events/': 'app',
      '/events/list/': 'app',
      '/events/new/': 'app',
      '/groups/': 'app',
      '/groups/list/': 'app',
      '/groups/new/': 'app',
      '/friends/': 'app',
      '/friends/add/': 'app',
      '/settlements/': 'app',
      '/profile/': 'app',
      '/404': 'app',
      '/showcase/': 'showcase',
    };
    for (const [route, group] of Object.entries(owner)) {
      expect(await groupsFor(route), route).toEqual([group]);
    }
  });

  it('only tightens through overrides, never raises a group budget', () => {
    for (const [name, group] of Object.entries(budgets.groups)) {
      for (const [pattern, kb] of Object.entries(group.overrides ?? {})) {
        expect(kb, `${name} ${pattern}`).toBeLessThanOrEqual(group.maxStaticJsGzKb);
        expect(kb, `${name} ${pattern}`).toBeGreaterThan(0);
      }
    }
  });

  // B19b: the dialogs on /friends, /profile and /settlements and the timeline hover cards on /events/list load
  // on first use, and the showcase no longer drags the Supabase client in through its reset-button demo. Each
  // ceiling is the measurement after that work plus ~5%; it may only ever go DOWN from here.
  it.each([
    ['/friends/', 248],
    ['/profile/', 248],
    ['/settlements/', 254],
    ['/events/list/', 246],
    ['/showcase/', 179],
  ])('holds %s to at most %i kB static JS (tightened by B19b, never raised)', async (route, ceiling) => {
    const lib = (await import(/* @vite-ignore */ LIB)) as {
      groupsFor: (r: string, b: unknown) => string[];
      budgetFor: (g: unknown, r: string) => number;
    };
    const [name] = lib.groupsFor(route, budgets);
    expect(lib.budgetFor(budgets.groups[name!], route)).toBeLessThanOrEqual(ceiling);
  });

  it('holds the redirect stubs (meta refresh, no script) to almost nothing', () => {
    const overrides = budgets.groups.app.overrides ?? {};
    for (const stub of ['/expenses', '/events', '/groups', '/friends/add']) expect(overrides[stub], stub).toBeLessThanOrEqual(1);
  });
});

describe('the gate is part of `npm run check`', () => {
  const scripts = (JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts;

  it('runs check:budgets after the build, next to the other bundle checks', () => {
    const steps = scripts.check.split(/\s+/);
    expect(steps).toContain('check:budgets');
    expect(steps.indexOf('check:budgets')).toBeGreaterThan(steps.indexOf('build'));
    expect(scripts['check:budgets']).toBe('node scripts/check-budgets.mjs');
  });

  it('keeps the 40 kB marketing budget in one place: check-auth-bundle no longer hard-codes it', () => {
    const script = readFileSync(resolve(ROOT, 'scripts/check-auth-bundle.mjs'), 'utf8');
    expect(script).not.toMatch(/MARKETING_LAYOUT_BUDGET_BYTES/);
  });
});
