import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Plan B19: page-size budgets are a HARD gate on every PR, measured as the
 * gzipped JS a page loads STATICALLY: the module graph from its entry script
 * tags and their static imports, never a dynamic `import()` chunk. These tests
 * run the measurement over a synthetic `dist/` (the real one only exists after
 * `astro build`, which runs after the unit tests in `npm run check`).
 */
const LIB = pathToFileURL(resolve(__dirname, '../../scripts/lib/bundle-graph.mjs')).href;
const SCRIPT = resolve(__dirname, '../../scripts/check-budgets.mjs');

type Measurement = {
  route: string;
  jsGz: number;
  cssGz: number;
  totalGz: number;
  withLazyGz: number;
  chunks: { name: string; gz: number }[];
};
type Lib = {
  routeOf: (file: string) => string;
  listPages: (dist: string) => { route: string; file: string }[];
  measurePage: (dist: string, file: string) => Measurement;
  groupFor: (route: string, budgets: Budgets) => string | undefined;
  evaluate: (measurements: Measurement[], budgets: Budgets) => { failures: string[]; warnings: string[] };
};
type Budgets = {
  groups: Record<
    string,
    {
      pages: string[];
      maxStaticJsGzKb: number;
      maxTotalGzKb?: number;
      dominantChunk: string;
      /** Tighter per-page budgets inside the group: pattern -> kB. First match wins. */
      overrides?: Record<string, number>;
    }
  >;
};

async function lib(): Promise<Lib> {
  return (await import(/* @vite-ignore */ LIB)) as Lib;
}

const noise = (seed: string, bytes: number) => {
  // Incompressible-ish filler so gz sizes are large and stable enough to tell apart.
  let out = '';
  let x = seed.length * 2654435761;
  while (out.length < bytes) {
    x = (x * 1103515245 + 12345) >>> 0;
    out += x.toString(36);
  }
  return out.slice(0, bytes);
};
const gz = (text: string) => gzipSync(text).length;

let dist: string;
const write = (rel: string, content: string) => {
  const path = join(dist, rel);
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, content);
};

// `app` statically imports `shared` and dynamically imports `lazy`; `react` is
// the renderer. Vite emits `from"./x.js"` (minified) and `import("./x.js")`.
const CHUNKS = {
  'react.AAA.js': `export const r="${noise('r', 4000)}";`,
  'shared.BBB.js': `export const s="${noise('s', 3000)}";`,
  'lazy.CCC.js': `export const l="${noise('l', 6000)}";`,
  'app.DDD.js': `import{s}from"./shared.BBB.js";export default ()=>import("./lazy.CCC.js").then(()=>s+"${noise('a', 1000)}");`,
};
const page = (base: string, island: string) =>
  `<html><head><link rel="stylesheet" href="${base}/_astro/site.css"><style>body{color:red}</style></head><body>` +
  `<astro-island component-url="${base}/_astro/${island}" renderer-url="${base}/_astro/react.AAA.js" client="only"></astro-island>` +
  `<script type="module" src="${base}/_astro/tiny.EEE.js"></script></body></html>`;

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), 'check-budgets-'));
  for (const [name, src] of Object.entries(CHUNKS)) write(`_astro/${name}`, src);
  write('_astro/tiny.EEE.js', 'export {};');
  write('_astro/site.css', `a{color:blue}${noise('css', 800)}`);
  write('index.html', page('', 'app.DDD.js'));
  write('auth/signin/index.html', page('', 'app.DDD.js'));
  write('landing/index.html', '<html><body><p>static</p></body></html>');
  write('404.html', page('', 'app.DDD.js'));
});
afterEach(() => rmSync(dist, { recursive: true, force: true }));

describe('routeOf / listPages', () => {
  it('maps built files to the routes users visit', async () => {
    const { routeOf, listPages } = await lib();
    expect(routeOf('index.html')).toBe('/');
    expect(routeOf('404.html')).toBe('/404');
    expect(routeOf('auth/signin/index.html')).toBe('/auth/signin/');
    expect(listPages(dist).map((p) => p.route).sort()).toEqual(['/', '/404', '/auth/signin/', '/landing/']);
  });
});

describe('measurePage: statically loaded gz JS', () => {
  it('counts the entry chunks and their static imports, and leaves out dynamic import() chunks', async () => {
    const { measurePage } = await lib();
    const m = measurePage(dist, 'index.html');
    expect(m.chunks.map((c) => c.name).sort()).toEqual(['app.DDD.js', 'react.AAA.js', 'shared.BBB.js', 'tiny.EEE.js']);
    const expected = ['app.DDD.js', 'react.AAA.js', 'shared.BBB.js', 'tiny.EEE.js']
      .map((n) => gz(n === 'tiny.EEE.js' ? 'export {};' : (CHUNKS as Record<string, string>)[n]))
      .reduce((a, b) => a + b, 0);
    expect(m.jsGz).toBe(expected);
    // the lazy chunk is not part of what the page loads up front...
    expect(m.chunks.some((c) => c.name.startsWith('lazy'))).toBe(false);
    // ...but the informational worst case still shows it, so a reduction that only moves weight is visible
    expect(m.withLazyGz).toBe(expected + gz(CHUNKS['lazy.CCC.js']));
  });

  it('adds linked and inline CSS to the total transfer, not to the JS figure', async () => {
    const { measurePage } = await lib();
    const m = measurePage(dist, 'index.html');
    expect(m.cssGz).toBe(gz(`a{color:blue}${noise('css', 800)}`) + gz('body{color:red}'));
    expect(m.totalGz).toBe(m.jsGz + m.cssGz);
  });

  it('finds the same graph when the site is served under a base path', async () => {
    write('index.html', page('/JustSplit', 'app.DDD.js'));
    const { measurePage } = await lib();
    expect(measurePage(dist, 'index.html').chunks.map((c) => c.name)).toContain('shared.BBB.js');
  });

  it('measures a page with no scripts as zero', async () => {
    const { measurePage } = await lib();
    expect(measurePage(dist, 'landing/index.html').jsGz).toBe(0);
  });

  it('fails loudly on a chunk the HTML names but dist does not contain', async () => {
    write('index.html', page('', 'gone.ZZZ.js'));
    const { measurePage } = await lib();
    expect(() => measurePage(dist, 'index.html')).toThrow(/gone\.ZZZ\.js/);
  });
});

describe('groupFor', () => {
  const budgets: Budgets = {
    groups: {
      marketing: { pages: ['/landing', '/about'], maxStaticJsGzKb: 40, dominantChunk: 'x' },
      auth: { pages: ['/auth/*'], maxStaticJsGzKb: 200, dominantChunk: 'x' },
      app: { pages: ['/', '/expenses/*', '/friends*', '/404'], maxStaticJsGzKb: 300, dominantChunk: 'x' },
    },
  };
  it('matches exact routes, `/x/*` families (including `/x` itself) and `/x*` prefixes, ignoring trailing slashes', async () => {
    const { groupFor } = await lib();
    expect(groupFor('/landing/', budgets)).toBe('marketing');
    expect(groupFor('/auth/signin/', budgets)).toBe('auth');
    expect(groupFor('/', budgets)).toBe('app');
    expect(groupFor('/expenses/', budgets)).toBe('app');
    expect(groupFor('/expenses/list/', budgets)).toBe('app');
    expect(groupFor('/friends/add/', budgets)).toBe('app');
    expect(groupFor('/404', budgets)).toBe('app');
  });
  it('does not treat `/` as a prefix of everything', async () => {
    const { groupFor } = await lib();
    expect(groupFor('/showcase/', budgets)).toBeUndefined();
  });
});

describe('evaluate', () => {
  const m = (route: string, jsKb: number, totalKb = jsKb + 10): Measurement => ({
    route,
    jsGz: jsKb * 1024,
    cssGz: 0,
    totalGz: totalKb * 1024,
    withLazyGz: jsKb * 1024,
    chunks: [{ name: 'react.AAA.js', gz: jsKb * 1024 }],
  });
  const budgets: Budgets = {
    groups: {
      marketing: { pages: ['/landing/'], maxStaticJsGzKb: 40, maxTotalGzKb: 150, dominantChunk: 'react' },
      app: { pages: ['/'], maxStaticJsGzKb: 100, dominantChunk: 'react' },
    },
  };

  it('passes pages at or under budget', async () => {
    const { evaluate } = await lib();
    expect(evaluate([m('/landing/', 40), m('/', 100)], budgets).failures).toEqual([]);
  });

  it('fails a page over its group budget and names page, size and budget', async () => {
    const { evaluate } = await lib();
    const { failures } = evaluate([m('/landing/', 5), m('/', 101)], budgets);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/\/.*101\.0.*100/);
  });

  it('fails a group total budget when one is set, and only then', async () => {
    const { evaluate } = await lib();
    expect(evaluate([m('/landing/', 10, 151), m('/', 5)], budgets).failures).toHaveLength(1);
    // the app group has no maxTotalGzKb: total is informational
    expect(evaluate([m('/landing/', 10), m('/', 90, 900)], budgets).failures).toEqual([]);
  });

  it('fails a built page that no group budgets, so a new page cannot ship unmeasured', async () => {
    const { evaluate } = await lib();
    const { failures } = evaluate([m('/landing/', 5), m('/', 5), m('/brand-new/', 5)], budgets);
    expect(failures.join('\n')).toMatch(/\/brand-new\/.*no budget/);
  });

  it('fails a budget entry that matches no built page, so a stale budget cannot linger', async () => {
    const { evaluate } = await lib();
    const { failures } = evaluate([m('/', 5)], budgets);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatch(/\/landing\/.*matches no built page/);
  });

  describe('per-page overrides inside a group', () => {
    const withOverrides: Budgets = {
      groups: {
        app: {
          pages: ['/', '/groups/*', '/settlements'],
          maxStaticJsGzKb: 280,
          dominantChunk: 'react',
          overrides: { '/': 240, '/groups/*': 230 },
        },
      },
    };
    it('gates a page against its own, tighter budget', async () => {
      const { evaluate } = await lib();
      const ok = evaluate([m('/', 240), m('/groups/list/', 230), m('/settlements/', 280)], withOverrides);
      expect(ok.failures).toEqual([]);
      const over = evaluate([m('/', 241), m('/groups/list/', 231), m('/settlements/', 281)], withOverrides).failures;
      expect(over).toHaveLength(3);
      expect(over[0]).toMatch(/\/: static JS 241\.0 kB.*budget 240 kB/);
      expect(over[1]).toMatch(/\/groups\/list\/.*budget 230 kB/);
      expect(over[2]).toMatch(/\/settlements\/.*budget 280 kB/);
    });

    it('lets the first matching override win, so an exact page can sit before its family', async () => {
      const { evaluate } = await lib();
      const budgets: Budgets = {
        groups: {
          app: { pages: ['/groups/*'], maxStaticJsGzKb: 280, dominantChunk: 'react', overrides: { '/groups': 1, '/groups/*': 230 } },
        },
      };
      expect(evaluate([m('/groups/', 1), m('/groups/list/', 230)], budgets).failures).toEqual([]);
      expect(evaluate([m('/groups/', 2), m('/groups/list/', 230)], budgets).failures).toHaveLength(1);
    });

    it('rejects an override that is not tighter than its group: a budget is never raised through the side door', async () => {
      const { evaluate } = await lib();
      const raised: Budgets = {
        groups: { app: { pages: ['/'], maxStaticJsGzKb: 100, dominantChunk: 'react', overrides: { '/': 150 } } },
      };
      const { failures } = evaluate([m('/', 10)], raised);
      expect(failures.join('\n')).toMatch(/override.*150.*group.*100/i);
    });

    it('rejects an override that matches no page of the group', async () => {
      const { evaluate } = await lib();
      const stale: Budgets = {
        groups: { app: { pages: ['/'], maxStaticJsGzKb: 100, dominantChunk: 'react', overrides: { '/gone': 10 } } },
      };
      expect(evaluate([m('/', 10)], stale).failures.join('\n')).toMatch(/override "\/gone".*matches no built page/i);
    });
  });

  it('warns, without failing, when the largest chunk is not the one the budget names', async () => {
    const { evaluate } = await lib();
    const wrong: Budgets = { groups: { app: { pages: ['/'], maxStaticJsGzKb: 100, dominantChunk: 'supabase' } } };
    const { failures, warnings } = evaluate([m('/', 5)], wrong);
    expect(failures).toEqual([]);
    expect(warnings.join('\n')).toMatch(/supabase/);
  });
});

describe('scripts/check-budgets.mjs (CLI)', () => {
  const run = (budgets: object, args: string[] = []) => {
    const file = join(dist, '..', `budgets-${process.pid}.json`);
    writeFileSync(file, JSON.stringify(budgets));
    try {
      return spawnSync(process.execPath, [SCRIPT, ...args], {
        encoding: 'utf8',
        env: { ...process.env, BUDGET_DIST: dist, BUDGET_FILE: file },
      });
    } finally {
      rmSync(file, { force: true });
    }
  };
  const generous = {
    groups: {
      marketing: { pages: ['/landing/'], maxStaticJsGzKb: 40, maxTotalGzKb: 150, dominantChunk: 'n/a' },
      auth: { pages: ['/auth/*'], maxStaticJsGzKb: 100, dominantChunk: 'react' },
      app: { pages: ['/', '/404'], maxStaticJsGzKb: 100, dominantChunk: 'react' },
    },
  };

  it('exits 0 and prints one row per page when every page is within budget', () => {
    const r = run(generous);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\/auth\/signin\//);
    expect(r.stdout).toMatch(/static JS/i);
  });

  it('exits 1 when a page is over budget, and prints why', () => {
    const tight = structuredClone(generous);
    tight.groups.app.maxStaticJsGzKb = 1;
    const r = run(tight);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/over budget|exceeds/i);
  });

  it('--report prints the measurement and never fails on a budget', () => {
    const tight = structuredClone(generous);
    tight.groups.app.maxStaticJsGzKb = 1;
    const r = run(tight, ['--report']);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/\/auth\/signin\//);
  });
});
