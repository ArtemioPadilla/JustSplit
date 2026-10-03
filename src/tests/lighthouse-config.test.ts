import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B19: Lighthouse CI is run by hand from a developer machine against the live
 * staging site in B18 (`npm run perf`), never in CI. `.lighthouserc.json` therefore
 * points at absolute URLs, with no local build or static server. Since B20a the
 * staging site is the `inceptor` branch's Cloudflare Pages preview (the production
 * domain only serves a build once `main` is the Astro tree); after the cutover the
 * three URLs move to `https://split.cybere.co` (B21).
 *
 * The script-size budgets are `assertMatrix` assertions on `resource-summary`.
 * They replace `lighthouse-budgets.json` + `settings.budgetsPath`, which stopped
 * gating anything when Lighthouse 12 removed its performance-budget audits
 * (the installed 12.6.1 has no `performance-budget` audit at all).
 */
const ROOT = resolve(__dirname, '../..');
const rc = JSON.parse(readFileSync(resolve(ROOT, '.lighthouserc.json'), 'utf8')) as {
  ci: {
    collect: { staticDistDir?: string; url: string[]; settings?: Record<string, unknown> };
    assert: {
      assertions?: unknown;
      assertMatrix: { matchingUrlPattern: string; assertions: Record<string, [string, Record<string, number>]> }[];
    };
  };
};
const budgets = JSON.parse(readFileSync(resolve(ROOT, 'performance-budgets.json'), 'utf8')) as {
  groups: Record<string, { maxStaticJsGzKb: number; overrides?: Record<string, number> }>;
};
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };

const STAGING = 'https://inceptor.justsplit.pages.dev';
const scriptBudgetKb = (pattern: string) => {
  const entry = rc.ci.assert.assertMatrix.find((m) => m.matchingUrlPattern === pattern);
  expect(entry, pattern).toBeTruthy();
  return entry!.assertions['resource-summary:script:size']![1].maxNumericValue / 1024;
};
const patternFor = (url: string) => rc.ci.assert.assertMatrix.find((m) => new RegExp(m.matchingUrlPattern).test(url))?.matchingUrlPattern;

describe('.lighthouserc.json (plan B19)', () => {
  it('audits the live staging site (the inceptor preview): absolute URLs, no static server, no local build', () => {
    expect(rc.ci.collect.staticDistDir).toBeUndefined();
    expect(rc.ci.collect.url).toEqual([`${STAGING}/landing/`, `${STAGING}/auth/signin/`, `${STAGING}/`]);
    expect(pkg.scripts.perf).toBe('lhci collect && lhci assert');
  });

  it('retires the inert budgets file and settings.budgetsPath', () => {
    expect(existsSync(resolve(ROOT, 'lighthouse-budgets.json'))).toBe(false);
    expect(rc.ci.collect.settings).not.toHaveProperty('budgetsPath');
  });

  it('asserts per URL through assertMatrix (it cannot be combined with top-level assertions)', () => {
    expect(rc.ci.assert.assertions).toBeUndefined();
    for (const url of rc.ci.collect.url) expect(patternFor(url), url).toBeTruthy();
    // and each URL lands in exactly one entry
    for (const url of rc.ci.collect.url) {
      expect(rc.ci.assert.assertMatrix.filter((m) => new RegExp(m.matchingUrlPattern).test(url))).toHaveLength(1);
    }
  });

  it('keeps the category scores and the script budget in every entry', () => {
    for (const entry of rc.ci.assert.assertMatrix) {
      expect(entry.assertions['categories:performance']?.[0], entry.matchingUrlPattern).toBe('error');
      expect(entry.assertions['categories:accessibility']?.[0]).toBe('error');
      expect(entry.assertions['categories:best-practices']?.[0]).toBe('error');
      expect(entry.assertions['categories:seo']?.[0]).toBe('error');
      expect(entry.assertions['resource-summary:script:size']?.[0]).toBe('error');
    }
  });

  it('marketing pages keep Inceptor\'s 150 kB script budget', () => {
    expect(scriptBudgetKb(patternFor(`${STAGING}/landing/`)!)).toBe(150);
  });

  // Lighthouse counts every script the page loads, including the chunks that load at
  // mount (the service-worker registration) that the hard gate leaves out, so its budget
  // sits a little above the static one: at least the gate's, at most 10% over.
  it.each([
    ['auth', `${STAGING}/auth/signin/`, () => budgets.groups.auth.maxStaticJsGzKb],
    ['the dashboard shell', `${STAGING}/`, () => budgets.groups.app.overrides!['/']!],
  ])('%s: the Lighthouse script budget tracks the hard gate in performance-budgets.json', (_name, url, gate) => {
    const lighthouse = scriptBudgetKb(patternFor(url)!);
    expect(lighthouse).toBeGreaterThanOrEqual(gate());
    expect(lighthouse).toBeLessThanOrEqual(Math.ceil(gate() * 1.1));
  });
});
