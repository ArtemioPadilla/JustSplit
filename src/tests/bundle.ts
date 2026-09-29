import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Bundle with the Vite that `astro build` uses (Astro pins its own, Rollup-based),
 * not the newer one Vitest runs on: chunking and tree-shaking must match production.
 * Shared by the tests that bundle real modules (plan B19).
 */
export async function astroVite(): Promise<typeof import('vite')> {
  const astroDir = dirname(createRequire(import.meta.url).resolve('astro/package.json'));
  const viteEntry = createRequire(resolve(astroDir, 'package.json')).resolve('vite/package.json');
  return import(/* @vite-ignore */ pathToFileURL(resolve(dirname(viteEntry), 'dist/node/index.js')).href);
}
