import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CLAUDE.md quality bar: "New UI components must appear in the /showcase
 * page." UserMenuIsland (plan B6) is the first Track B island to ship —
 * this asserts it gets a live section, not just a name in the placeholder
 * list the scaffold left behind.
 */
const ROOT = resolve(__dirname, '..', '..');
const src = readFileSync(resolve(ROOT, 'src/pages/showcase.astro'), 'utf8');

describe('/showcase (plan B6)', () => {
  it('mounts UserMenuIsland live', () => {
    expect(src).toMatch(/import\s+UserMenuIsland\s+from\s+['"][^'"]*UserMenuIsland['"]/);
    expect(src).toMatch(/<UserMenuIsland\s+client:idle/);
  });
});

/**
 * Plan B16: "islands never re-invent or stub them" — CurrencySelector,
 * CurrencyExchangeTicker, Editable and ProgressBar are shared widgets every
 * Phase 2 island depends on, so every one of them must get a live showcase
 * section (CLAUDE.md quality bar), not just exist as a file.
 */
describe('/showcase (plan B16)', () => {
  it('mounts CurrencySelector live, hydrated (needs value/onChange state)', () => {
    expect(src).toMatch(/import\s+ShowcaseCurrencySelector\s+from\s+['"][^'"]*ShowcaseCurrencySelector['"]/);
    expect(src).toMatch(/<ShowcaseCurrencySelector\s+client:(idle|visible)/);
  });

  it('mounts CurrencyExchangeTicker live, hydrated only when scrolled into view', () => {
    expect(src).toMatch(/import\s+CurrencyExchangeTicker\s+from\s+['"][^'"]*CurrencyExchangeTicker['"]/);
    expect(src).toMatch(/<CurrencyExchangeTicker\s+client:visible/);
  });

  it('mounts Editable live, hydrated (needs onValueCommit state)', () => {
    expect(src).toMatch(/import\s+ShowcaseEditable\s+from\s+['"][^'"]*ShowcaseEditable['"]/);
    expect(src).toMatch(/<ShowcaseEditable\s+client:(idle|visible)/);
  });

  it('mounts ProgressBar (no interactivity — rendered statically, no client:* hydration)', () => {
    expect(src).toMatch(/import\s+\{\s*ProgressBar\s*\}\s+from\s+['"][^'"]*progress-bar['"]/);
    expect(src).toMatch(/<ProgressBar\s+value=/);
    expect(src).not.toMatch(/<ProgressBar[^>]*client:/);
  });
});
