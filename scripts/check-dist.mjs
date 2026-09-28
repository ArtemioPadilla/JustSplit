#!/usr/bin/env node
// Post-build assertions (plan B2c): runs after `astro build` in `npm run check`.
// dist/404.html must be the app shell, and the redirect pages must be emitted.
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const need = (cond, msg) => cond || failures.push(msg);

const notFound = 'dist/404.html';
need(existsSync(notFound), `${notFound} is missing`);
if (existsSync(notFound)) {
  const html = readFileSync(notFound, 'utf8');
  need(/<astro-island[^>]*component-url="[^"]*AppRouterIsland/.test(html), `${notFound} does not mount AppRouterIsland`);
  need(/client="only"/.test(html), `${notFound}: AppRouterIsland is not client:only`);
  need(/<meta name="robots" content="noindex"/.test(html), `${notFound} is missing robots noindex`);
}

for (const family of ['expenses', 'events', 'groups']) {
  const page = `dist/${family}/index.html`;
  need(existsSync(page), `${page} is missing`);
  if (existsSync(page)) need(/http-equiv="refresh"/.test(readFileSync(page, 'utf8')), `${page} has no meta refresh`);
}

if (failures.length) {
  console.error(`check:dist failed:\n  - ${failures.join('\n  - ')}`);
  process.exit(1);
}
console.log('check:dist ok (404 shell + redirect pages)');
