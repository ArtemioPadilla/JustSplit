/**
 * Reads a built `dist/` and answers "how much JS does this page load up front?"
 * (plan B19). Shared by `scripts/check-budgets.mjs` (the hard gate),
 * `check-auth-bundle.mjs` and `check-charts-bundle.mjs`, so every check agrees
 * on what "statically loaded" means:
 *
 *   the chunks a page's HTML names directly (`astro-island` component-url /
 *   renderer-url, plain `<script src>`), plus everything THEY import
 *   statically, transitively. A chunk reached only through a dynamic
 *   `import()` is fetched on demand, so it is not part of the page's weight
 *   (`withLazyGz` still reports the worst case, for information, so a
 *   reduction that merely moves weight behind a lazy boundary stays visible).
 *
 * Regexes match Vite's minified output (`from"./x.js"`, `import"./x.js"`,
 * `import("./x.js")`), with either a bare or a base-prefixed asset URL
 * (`/_astro/x.js` and `/JustSplit/_astro/x.js`).
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const gz = (content) => gzipSync(content).length;
const KB = 1024;

/** `index.html` -> `/`, `404.html` -> `/404`, `auth/signin/index.html` -> `/auth/signin/`. */
export function routeOf(file) {
  const f = file.split('\\').join('/');
  if (f === 'index.html') return '/';
  if (f.endsWith('/index.html')) return `/${f.slice(0, -'index.html'.length)}`;
  return `/${f.replace(/\.html$/, '')}`;
}

/** Every built HTML page (the `_astro` asset directory is skipped). */
export function listPages(dist) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (name === '_astro') continue;
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.html')) {
        const file = relative(dist, path).split('\\').join('/');
        out.push({ route: routeOf(file), file });
      }
    }
  };
  walk(dist);
  return out.sort((a, b) => a.route.localeCompare(b.route));
}

const ASSET = String.raw`[^"'\s]*\/_astro\/([A-Za-z0-9._-]+\.js)`;

/** Chunks a page's HTML names directly. */
export function directEntries(html) {
  const found = [
    ...html.matchAll(new RegExp(String.raw`(?:component-url|renderer-url)=["']${ASSET}["']`, 'g')),
    ...html.matchAll(new RegExp(String.raw`<script[^>]+src=["']${ASSET}["']`, 'g')),
  ];
  return [...new Set(found.map((m) => m[1]))];
}

const STATIC_IMPORT = /(?:from|import)\s*["']\.\/([A-Za-z0-9._-]+\.js)["']/g;
const DYNAMIC_IMPORT = /import\(\s*["']\.\/([A-Za-z0-9._-]+\.js)["']\s*\)/g;

function readChunk(dist, name) {
  const path = join(dist, '_astro', name);
  if (!existsSync(path)) throw new Error(`${name} is referenced by the build output but dist/_astro/${name} does not exist`);
  return readFileSync(path, 'utf8');
}

/** Transitive closure over static imports only (`withDynamic: true` also follows `import()`). */
export function chunkGraph(dist, entries, { withDynamic = false } = {}) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length > 0) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const src = readChunk(dist, name);
    const patterns = withDynamic ? [STATIC_IMPORT, DYNAMIC_IMPORT] : [STATIC_IMPORT];
    for (const pattern of patterns) {
      for (const m of src.matchAll(pattern)) if (!seen.has(m[1])) queue.push(m[1]);
    }
  }
  return seen;
}

/** gz of every stylesheet the page links from `_astro/`, plus its inline `<style>` blocks. */
function cssGzOf(dist, html) {
  let total = 0;
  for (const tag of html.matchAll(/<link\b[^>]*>/g)) {
    if (!/rel=["']stylesheet["']/.test(tag[0])) continue;
    const href = /href=["'][^"']*\/_astro\/([A-Za-z0-9._-]+\.css)["']/.exec(tag[0]);
    if (!href) continue;
    const path = join(dist, '_astro', href[1]);
    if (!existsSync(path)) throw new Error(`${href[1]} is linked by the page but dist/_astro/${href[1]} does not exist`);
    total += gz(readFileSync(path));
  }
  for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) total += gz(style[1]);
  return total;
}

/**
 * The measurement for one built page: `jsGz` is the statically loaded gzipped
 * JS the budget gates; `totalGz` (JS + CSS) is for information; `withLazyGz`
 * additionally counts every dynamic `import()` chunk (worst case, information).
 */
export function measurePage(dist, file) {
  const html = readFileSync(join(dist, file), 'utf8');
  const entries = directEntries(html);
  const chunks = [...chunkGraph(dist, entries)]
    .map((name) => ({ name, gz: gz(readChunk(dist, name)) }))
    .sort((a, b) => b.gz - a.gz || a.name.localeCompare(b.name));
  const jsGz = chunks.reduce((sum, c) => sum + c.gz, 0);
  const withLazyGz = [...chunkGraph(dist, entries, { withDynamic: true })].reduce((sum, name) => sum + gz(readChunk(dist, name)), 0);
  const cssGz = cssGzOf(dist, html);
  return { route: routeOf(file), file, jsGz, cssGz, totalGz: jsGz + cssGz, withLazyGz, chunks };
}

const normalise = (route) => (route.length > 1 ? route.replace(/\/+$/, '') : route);

/**
 * Budget patterns: an exact route (`/settlements`), a family (`/expenses/*`,
 * which also covers `/expenses` itself: the redirect page), or a prefix
 * (`/friends*`). Trailing slashes never matter. `/` is only the root.
 */
function matches(pattern, route) {
  const p = normalise(pattern);
  const r = normalise(route);
  if (!p.endsWith('*')) return p === r;
  const prefix = p.slice(0, -1);
  if (prefix.endsWith('/')) return r.startsWith(prefix) || r === normalise(prefix);
  return r.startsWith(prefix);
}

export function groupsFor(route, budgets) {
  return Object.entries(budgets.groups)
    .filter(([, group]) => group.pages.some((pattern) => matches(pattern, route)))
    .map(([name]) => name);
}

export const groupFor = (route, budgets) => groupsFor(route, budgets)[0];

/**
 * Budgets vs measurements. Failures are hard (the build fails); warnings are
 * not. A page nothing budgets, and a budget entry no page matches, both fail:
 * a new page must not ship unmeasured, and a stale entry must not silently
 * leave a family ungated.
 */
export function evaluate(measurements, budgets) {
  const failures = [];
  const warnings = [];
  for (const m of measurements) {
    const groups = groupsFor(m.route, budgets);
    if (groups.length === 0) {
      failures.push(`${m.route}: no budget group covers this page — add it to performance-budgets.json`);
      continue;
    }
    if (groups.length > 1) {
      failures.push(`${m.route}: covered by more than one budget group (${groups.join(', ')}) — make the patterns disjoint`);
      continue;
    }
    const group = budgets.groups[groups[0]];
    const jsKb = m.jsGz / KB;
    if (jsKb > group.maxStaticJsGzKb) {
      failures.push(
        `${m.route}: static JS ${jsKb.toFixed(1)} kB gz is over budget ${group.maxStaticJsGzKb} kB (group "${groups[0]}"; ` +
          `largest chunk ${m.chunks[0]?.name ?? 'none'}). Fix the regression; never raise a budget to absorb it.`,
      );
    }
    const totalKb = m.totalGz / KB;
    if (group.maxTotalGzKb != null && totalKb > group.maxTotalGzKb) {
      failures.push(`${m.route}: total JS+CSS ${totalKb.toFixed(1)} kB gz is over budget ${group.maxTotalGzKb} kB (group "${groups[0]}")`);
    }
    const largest = m.chunks[0];
    if (largest && group.dominantChunk && !largest.name.includes(group.dominantChunk)) {
      warnings.push(
        `${m.route}: the largest chunk is ${largest.name}, not "${group.dominantChunk}" as group "${groups[0]}" says — update dominantChunk`,
      );
    }
  }
  for (const [name, group] of Object.entries(budgets.groups)) {
    for (const pattern of group.pages) {
      if (!measurements.some((m) => matches(pattern, m.route))) {
        failures.push(`${pattern} (group "${name}") matches no built page — remove or fix the budget entry`);
      }
    }
  }
  return { failures, warnings };
}
