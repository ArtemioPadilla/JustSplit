/**
 * The three browser configurations every accessibility pass runs in
 * (plan B6b): the default light desktop view, the dark theme (BaseLayout's
 * head script follows prefers-color-scheme when no theme is stored), and a
 * 375px phone, where nothing may push the page sideways.
 * Shared by `axe-smoke.mjs` (signed out) and `live-smoke.mjs` (signed in).
 */
export const CONFIGS = [
  { name: 'light', contextOptions: { colorScheme: 'light' }, checkOverflow: false },
  { name: 'dark', contextOptions: { colorScheme: 'dark' }, checkOverflow: false },
  {
    name: '375px',
    contextOptions: { colorScheme: 'light', viewport: { width: 375, height: 812 } },
    checkOverflow: true,
  },
];
