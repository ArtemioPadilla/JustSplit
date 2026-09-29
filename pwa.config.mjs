/**
 * The PWA configuration (`@vite-pwa/astro`), as plain functions of the deploy
 * base so `astro.config.mjs` and `src/tests/pwa-config.test.ts` share one source.
 * Plan B19. `base` is `BASE` from astro.config.mjs (`/JustSplit` on Pages, `/`
 * on a custom domain or locally); `withBase()` / `import.meta.env.BASE_URL`
 * cannot be evaluated in a config file, hence the helper below.
 */

/** `assetUrl('/JustSplit', '404.html')` -> `/JustSplit/404.html`; exactly one slash, any base shape. */
export const assetUrl = (base, path) => `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

/**
 * Clean-URL aliases for the precached pages.
 *
 * Astro emits `settlements/index.html`; Workbox already answers `/settlements/`
 * from it (directoryIndex), but the navigation links carry no trailing slash
 * (`/settlements`, `trailingSlash: 'ignore'`), and offline that URL would miss
 * the precache and land on the 404 shell, which cannot render a static page.
 * GitHub Pages redirects `/x` to `/x/` online; the worker has to do it offline.
 * So every `x/index.html` also gets an `x` entry, and `index.html` one for the
 * scope root (with and without the trailing slash).
 *
 * `404.html` is deliberately left as it is. `@vite-pwa/astro`'s own
 * `directoryAndTrailingSlashHandler` renames it to `404`, and then
 * `navigateFallback: '/404.html'` is not a precached URL: `createHandlerBoundToURL`
 * throws while the worker starts, so no worker ever installs.
 */
export function directoryAliasTransform(base) {
  const scope = assetUrl(base, '');
  return async (entries) => {
    const aliases = [];
    for (const entry of entries) {
      if (!entry.url.endsWith('.html')) continue;
      const url = entry.url.replace(/^\//, '');
      if (url === '404.html') continue;
      if (url === 'index.html') {
        aliases.push({ ...entry, url: scope });
        if (scope !== '/') aliases.push({ ...entry, url: scope.replace(/\/$/, '') });
        continue;
      }
      aliases.push({ ...entry, url: url.replace(/\/?index\.html$/, '') });
    }
    return { manifest: [...entries, ...aliases], warnings: [] };
  };
}

/**
 * Supabase's own endpoints, which can share a host with the app under a custom
 * domain and must never be answered with the app shell. (They are cross-origin on
 * `*.supabase.co`, where a navigation cannot reach the fallback anyway: belt and
 * braces.) Plus file-like paths: `/llms.txt` or a sitemap opened offline should
 * fail like a missing file, not render the shell.
 */
export const NAVIGATE_FALLBACK_DENYLIST = [
  /\/auth\/v1\//,
  /\/storage\/v1\//,
  /\/rest\/v1\//,
  /\/realtime\/v1\//,
  /\.(?:txt|xml|json|webmanifest|ico|png|jpe?g|svg|webp|js|css|map|woff2?)$/,
];

export function pwaOptions(base) {
  const dir = assetUrl(base, '');
  return {
    // `prompt`, not `autoUpdate`: autoUpdate reloads the page the moment a new
    // worker takes over, which would drop a half-filled expense form. The update
    // waits, `UpdateToast` offers "Reload", and the user picks the moment.
    registerType: 'prompt',
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
      id: dir,
      name: 'JustSplit',
      short_name: 'JustSplit',
      description: 'Fair expense splitting, made simple.',
      lang: 'en',
      categories: ['finance', 'productivity'],
      // JustSplit navy (plan B6): --color-primary-600 in global.css, and the
      // layout's <meta name="theme-color">. The splash background is the light
      // theme's --color-background; a manifest has no dark variant.
      theme_color: '#124d8c',
      background_color: '#ffffff',
      display: 'standalone',
      // The directory URL under the base, a precached page: `/JustSplit` (no
      // slash) is a redirect on GitHub Pages and not an offline start.
      start_url: dir,
      scope: dir,
      // Still the Inceptor scaffold's placeholder artwork; no plan issue
      // regenerates it. The JustSplit mark is public/images/logo-square.png at
      // 342px, too small for a 512px icon: it needs a vector or a 1024px source.
      icons: [
        { src: assetUrl(base, 'icons/pwa-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: assetUrl(base, 'icons/pwa-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: assetUrl(base, 'icons/pwa-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: assetUrl(base, 'icons/logo-source.svg'), sizes: 'any', type: 'image/svg+xml' },
      ],
      shortcuts: [
        { name: 'Add expense', short_name: 'Add expense', url: assetUrl(base, 'expenses/new/') },
        { name: 'Settle up', short_name: 'Settle up', url: assetUrl(base, 'settlements/') },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
      directoryIndex: 'index.html',
      manifestTransforms: [directoryAliasTransform(base)],
      // The offline shell (spec D2): an offline navigation to an app route with no
      // page of its own (/expenses/abc) gets the 404 shell, which mounts the
      // matching route island. Must be an exact precached URL (see the transform).
      navigateFallback: assetUrl(base, '404.html'),
      navigateFallbackDenylist: NAVIGATE_FALLBACK_DENYLIST,
      // Every query string, not just Workbox's default utm_*/fbclid: otherwise
      // `/auth/callback/?code=…` (Google sign-in on the second visit),
      // `/settlements/?event=…`, `/expenses/new?group=…`, `?next=` and the data
      // table's URL state all miss the precache and are answered with the shell.
      // A `navigateFallbackAllowlist` limited to the dynamic route families would
      // not fix that (a static page with a query string would still miss), so this
      // is the one used; hashed assets carry no query, so nothing else is affected.
      ignoreURLParametersMatching: [/.*/],
      // First install controls the page at once (offline works without a reload);
      // an update waits for the user (`prompt`).
      clientsClaim: true,
      skipWaiting: false,
      // Data is never cached by the worker: RLS-protected rows and signed URLs
      // belong to the query cache (and its logout wipe), not to Cache Storage.
      runtimeCaching: [{ urlPattern: /^https:\/\/[^/]+\.supabase\.co\//, handler: 'NetworkOnly' }],
    },
  };
}
