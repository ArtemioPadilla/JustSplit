import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import sitemap from '@astrojs/sitemap';
// Single-sourced canonical origin — see site.config.mjs for the rationale.
import { SITE_ORIGIN } from './site.config.mjs';
import { manualChunks, pureCyberEcoAuthSchemas } from './build.config.mjs';
import { pwaOptions } from './pwa.config.mjs';

// Subpath the site is served under. Production (Cloudflare Pages, split.cybere.co,
// ADR 0016) is served from the root, so the default is '/' everywhere and the
// deploy sets nothing. ASTRO_BASE stays for experiments and for a fork on GitHub
// project pages (<domain>/<repo>/); withBase() keeps working for any base
// (src/tests/production-base.test.ts). Never hardcode a base.
const BASE = process.env.ASTRO_BASE || '/';

export default defineConfig({
  site: SITE_ORIGIN,
  base: BASE,
  // `dist` unless a script asks for a private copy (scripts/offline-smoke.mjs builds
  // with a different base next to the one `npm run check` built). A path relative to
  // the project: with an absolute one outside it, @vite-pwa's precache glob finds
  // nothing but the public assets (8 entries instead of ~225) and the worker is empty.
  outDir: process.env.ASTRO_OUT_DIR || './dist',
  // Dev and Cloudflare Pages must agree on trailing slashes; 'ignore' serves both
  // /expenses/list and /expenses/list/ (Pages redirects /x to /x/ itself).
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/_') && !page.includes('/404') && !page.endsWith('.json'),
    }),
    react(),
    // Manifest, offline shell and Workbox rules: pwa.config.mjs (plan B19).
    AstroPWA(pwaOptions(BASE)),
  ],
  vite: {
    plugins: [tailwindcss(), pureCyberEcoAuthSchemas()],
    // Named vendor chunks (plan B19): see build.config.mjs.
    build: { rollupOptions: { output: { manualChunks } } },
    // @cyber-eco/auth's client entry reads process.env at runtime in a few
    // utilities; a browser bundle has no `process`, so these two keys are
    // statically replaced at build time (cybereco-hub/examples/static-app/README.md).
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV === 'production' ? 'production' : 'development'),
      'process.env.NEXT_PUBLIC_HUB_URL': JSON.stringify(process.env.PUBLIC_HUB_URL ?? ''),
    },
  },
  output: 'static',
});
