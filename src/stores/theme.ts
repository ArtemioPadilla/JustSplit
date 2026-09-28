import { atom, onMount } from 'nanostores';

export type Theme = 'light' | 'dark';

/**
 * Cross-island theme store. The inline <script is:inline> in BaseLayout.astro
 * is what applies the .dark class before first paint (zero-flash); this store
 * is the post-hydration source of truth that any island can read or write.
 *
 * Lifecycle:
 *   1. Page loads → inline script reads localStorage.theme (or system pref) and
 *      adds .dark to <html> before paint.
 *   2. Islands hydrate → onMount initializes $theme from the actual <html>
 *      class state (which the inline script already set).
 *   3. Subsequent reads/writes go through this store; it keeps <html> class
 *      and localStorage in sync automatically.
 */
export const $theme = atom<Theme>('light');

if (typeof document !== 'undefined') {
  onMount($theme, () => {
    // Initialize from the .dark class the inline head script already applied,
    // so the store's initial value matches what the user actually sees.
    $theme.set(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    // Keep <html> class and localStorage in sync whenever the store changes.
    const unsub = $theme.listen((next) => {
      const root = document.documentElement;
      if (next === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
      try {
        localStorage.setItem('theme', next);
      } catch (_) {
        // localStorage unavailable (Safari private mode, etc.) — still toggle
        // the class so the UI responds; persistence just won't survive reload.
      }
    });

    // Cross-tab sync: if the user toggles theme in another tab, mirror it here.
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        $theme.set(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  });
}

/** Flip the current theme. Safe to call from any island or Astro script. */
export function toggleTheme(): void {
  $theme.set($theme.get() === 'dark' ? 'light' : 'dark');
}
