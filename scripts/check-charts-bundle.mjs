#!/usr/bin/env node
// Post-build assertion for plan B8a: Recharts must never be in a page's
// static import graph — it is only ever reached through the
// `React.lazy(() => import('.../DashboardCharts.lazy'))` boundary
// (`src/components/islands/ShowcaseDashboardCharts.tsx`). Chained after
// `astro build` in `npm run check` (package.json), same precedent as
// `scripts/check-dist.mjs` / `scripts/check-auth-bundle.mjs` — unit tests run
// *before* the build and can't grep `dist/`.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const ASTRO_DIR = join(DIST, '_astro');
const failures = [];

// A string literal Recharts' ResponsiveContainer sets as a className
// (recharts/lib/component/ResponsiveContainer.js) — stable under
// minification because it's string content, not an identifier.
const RECHARTS_MARKER = 'recharts-responsive-container';

// Same shape as scripts/check-auth-bundle.mjs's directEntries/staticGraph:
// every chunk a page directly references from its built HTML (astro-island
// component-url/renderer-url, or a plain <script src>), followed
// transitively through STATIC `from"./x.js"` references only — a dynamically
// imported chunk (`import("./x.js")`) is fetched on demand, not on page
// load, so it must never appear in this graph.
function directEntries(html) {
  const island = [...html.matchAll(/(?:component-url|renderer-url)="[^"]*\/_astro\/([A-Za-z0-9._-]+\.js)"/g)];
  const script = [...html.matchAll(/<script[^>]+src="[^"]*\/_astro\/([A-Za-z0-9._-]+\.js)"/g)];
  return [...new Set([...island, ...script].map((m) => m[1]))];
}

function staticGraph(entryFiles) {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    const path = join(ASTRO_DIR, name);
    if (!existsSync(path)) continue;
    seen.add(name);
    const src = readFileSync(path, 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s*"\.\/([A-Za-z0-9._-]+\.js)"/g)) {
      if (!seen.has(m[1])) queue.push(m[1]);
    }
  }
  return seen;
}

// Every page whose islands compose the B8a chart widgets: /showcase
// (ShowcaseDashboardCharts) and, since plan B8b, / (DashboardIsland). Both
// must reach DashboardCharts.lazy.tsx only through the dynamic import().
const CHART_PAGES = [join(DIST, 'showcase', 'index.html'), join(DIST, 'index.html')];

if (!existsSync(ASTRO_DIR)) {
  failures.push(`${ASTRO_DIR} is missing — run \`astro build\` first`);
} else {
  for (const page of CHART_PAGES) {
    if (!existsSync(page)) {
      failures.push(`${page} is missing — run \`astro build\` first`);
      continue;
    }
    const html = readFileSync(page, 'utf8');
    const entries = directEntries(html);
    if (entries.length === 0) {
      failures.push(`${page} has no astro-island component-url/renderer-url or <script src> — did the page change shape?`);
      continue;
    }

    const graph = staticGraph(entries);
    const offenders = [...graph].filter((name) => readFileSync(join(ASTRO_DIR, name), 'utf8').includes(RECHARTS_MARKER));
    if (offenders.length > 0) {
      failures.push(
        `${page} statically loads Recharts (${offenders.join(', ')}) — the chart widgets must load ` +
          `through React.lazy(() => import('.../DashboardCharts.lazy')), not a static import`,
      );
    } else {
      console.log(`check-charts-bundle: ${page} loads no Recharts chunk up front (${graph.size} chunk(s) checked)`);
    }
  }

  // Informational: which chunk(s) actually carry Recharts, and confirm at
  // least one exists and is reached ONLY through a dynamic import() from
  // somewhere in the static graph — proves the lazy chunk is real, not just
  // "Recharts happens to be unused in this build".
  const allChunks = existsSync(ASTRO_DIR) ? readdirSync(ASTRO_DIR).filter((f) => f.endsWith('.js')) : [];
  const rechartsChunks = allChunks.filter((name) => readFileSync(join(ASTRO_DIR, name), 'utf8').includes(RECHARTS_MARKER));
  if (rechartsChunks.length === 0) {
    failures.push('no dist/_astro/*.js chunk contains the Recharts marker at all — did DashboardCharts.lazy.tsx move or lose its ui/charts imports?');
  } else {
    const dynamicallyReferenced = rechartsChunks.some((chunk) =>
      allChunks.some((other) => other !== chunk && readFileSync(join(ASTRO_DIR, other), 'utf8').includes(`import("./${chunk}")`)),
    );
    if (!dynamicallyReferenced) {
      failures.push(`Recharts chunk(s) (${rechartsChunks.join(', ')}) exist but no chunk reaches them via a dynamic import("./...") — the lazy boundary may be missing`);
    }
    console.log(`check-charts-bundle: Recharts lives in ${rechartsChunks.join(', ')}, reached only via a dynamic import()`);
  }
}

if (failures.length) {
  console.error(`\ncheck-charts-bundle failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('\ncheck-charts-bundle ok (Recharts stays out of the static import graph)');
