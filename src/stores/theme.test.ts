// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * $theme (plan B6 acceptance: "theme persists across reloads without
 * flash"). The no-flash half of that claim is a pre-paint synchronous
 * <script is:inline> in BaseLayout.astro — not something a jsdom test can
 * meaningfully exercise (there's no "before first paint" in jsdom); that
 * half is asserted at the source level in
 * src/tests/base-layout-theme-script.test.ts instead. What IS dynamically
 * testable here, and wasn't covered by any test before this file, is the
 * "persists" half: the store keeps <html class="dark">, localStorage, and
 * cross-tab sync all correct, which is what actually survives a reload.
 *
 * Each test re-imports the module after `vi.resetModules()` for a genuinely
 * fresh `$theme` atom: nanostores debounces onMount's teardown by 1 real
 * second (`STORE_UNMOUNT_DELAY`) specifically so a quick unsubscribe/
 * resubscribe does NOT re-run the mount initializer — exactly what "does
 * this atom read <html>'s class on its very first mount" needs to defeat.
 */
describe('$theme (plan B6)', () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('initializes from the .dark class the pre-paint script already applied', async () => {
    document.documentElement.classList.add('dark');
    const { $theme } = await import('./theme');
    const unsub = $theme.listen(() => {});
    expect($theme.get()).toBe('dark');
    unsub();
  });

  it('initializes as light when no .dark class is present', async () => {
    const { $theme } = await import('./theme');
    const unsub = $theme.listen(() => {});
    expect($theme.get()).toBe('light');
    unsub();
  });

  it('toggleTheme() flips the class and persists the new value to localStorage', async () => {
    const { $theme, toggleTheme } = await import('./theme');
    const unsub = $theme.listen(() => {});
    expect($theme.get()).toBe('light');

    toggleTheme();

    expect($theme.get()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    unsub();
  });

  it('mirrors a theme change from another tab (storage event) without a manual toggle', async () => {
    const { $theme } = await import('./theme');
    const unsub = $theme.listen(() => {});
    expect($theme.get()).toBe('light');

    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: 'dark' }));

    expect($theme.get()).toBe('dark');
    unsub();
  });
});
