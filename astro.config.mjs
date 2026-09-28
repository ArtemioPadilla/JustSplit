import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import AstroPWA from '@vite-pwa/astro';
import sitemap from '@astrojs/sitemap';
// Single-sourced canonical origin — see site.config.mjs for the rationale.
import { SITE_ORIGIN } from './site.config.mjs';

// Subpath the site is served under. GitHub *project* pages live at
// <domain>/<repo>/, so the Pages build sets ASTRO_BASE=/JustSplit (repository
// variable, see .github/workflows/deploy.yml); a custom domain sets it to '/'.
// Local dev leaves it unset → base '/'. Never hardcode it (spec D2).
const BASE = process.env.ASTRO_BASE || '/';
const asset = (p) => `${BASE.replace(/\/$/, '')}/${p.replace(/^\//, '')}`;

export default defineConfig({
  site: SITE_ORIGIN,
  base: BASE,
  // Dev and GitHub Pages must agree on trailing slashes; 'ignore' serves both
  // /expenses/list and /expenses/list/ (spec D2).
  trailingSlash: 'ignore',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/_') && !page.includes('/404') && !page.endsWith('.json'),
    }),
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon.png',
        'icons/pwa-192.png',
        'icons/pwa-512.png',
        'icons/pwa-maskable-512.png',
        'icons/logo-source.svg',
      ],
      manifest: {
        name: 'JustSplit',
        short_name: 'JustSplit',
        description: 'Fair expense splitting, made simple.',
        // JustSplit navy (plan B6) — matches --color-primary-600 in global.css
        // and BaseLayout's <meta name="theme-color">. Icons are still
        // Inceptor placeholders — no plan issue regenerates them yet.
        theme_color: '#124d8c',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: asset('icons/pwa-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: asset('icons/pwa-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: asset('icons/pwa-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: asset('icons/logo-source.svg'), sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // The 404 shell (B2c) handles client-only dynamic routes on GitHub
        // Pages; the SW must not answer them with the start page (plan B19
        // tightens this list once the route families exist).
        navigateFallback: asset('404.html'),
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
      },
      experimental: { directoryAndTrailingSlashHandler: true },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
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
