import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * /landing, /about, /help (plan B7, spec D3): plain Astro pages with no
 * route island — marketing content only. Ported from the legacy Next tree
 * (`src/app/{landing,about,help}/page.tsx` on `main`), with the dead links
 * the plan calls out fixed: `/auth/register` → `/auth/signup/`, and no
 * `/tos` / `/privacy` / `/contact` references (those pages never existed).
 *
 * These are source-text assertions (no Astro container render) — the same
 * style as base-layout.test.ts / site-header.test.ts.
 */
const ROOT = resolve(__dirname, '..', '..');

const PAGES: Record<string, string> = {
  landing: readFileSync(resolve(ROOT, 'src/pages/landing.astro'), 'utf8'),
  about: readFileSync(resolve(ROOT, 'src/pages/about.astro'), 'utf8'),
  help: readFileSync(resolve(ROOT, 'src/pages/help.astro'), 'utf8'),
};

const CLIENT_DIRECTIVE_RE = /client:(idle|load|only|visible|media)/;
const BARE_HREF_RE = /\bhref=["']\/(?!\/)[^"']*["']/;

describe.each(Object.entries(PAGES))('%s.astro (plan B7)', (_name, src) => {
  it('uses BaseLayout with the static marketing header (no route island, no React header)', () => {
    expect(src).toMatch(/import\s+BaseLayout\s+from\s+['"][^'"]*BaseLayout(\.astro)?['"]/);
    expect(src).toMatch(/<BaseLayout\b[^>]*\bmarketing\b/);
  });

  it('mounts no client:* island — no route island on a marketing page', () => {
    expect(src).not.toMatch(CLIENT_DIRECTIVE_RE);
  });

  it('has no bare root-relative href (every internal link goes through withBase())', () => {
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => BARE_HREF_RE.test(line) && !line.includes('withBase('));
    expect(offenders.map((o) => `${o.n}: ${o.line.trim()}`)).toEqual([]);
  });

  it('never links the dead /auth/register, /tos, /privacy or /contact routes', () => {
    expect(src).not.toMatch(/\/auth\/register/);
    expect(src).not.toMatch(/withBase\(['"]\/tos/);
    expect(src).not.toMatch(/withBase\(['"]\/privacy/);
    expect(src).not.toMatch(/withBase\(['"]\/contact/);
  });

});

describe('landing.astro content', () => {
  const src = PAGES.landing!;
  it('ports the real hero copy', () => {
    expect(src).toMatch(/Split expenses with friends and family/);
  });
  it('renders the FAQ as native <details> (no JS accordion)', () => {
    expect(src).toMatch(/<details/);
  });
  it('links sign-up through the real /auth/signup/ route', () => {
    expect(src).toMatch(/withBase\(['"]\/auth\/signup\/['"]\)/);
  });
});

describe('about.astro content', () => {
  const src = PAGES.about!;
  it('ports the real mission copy', () => {
    expect(src).toMatch(/Our Mission/);
  });
  it('links sign-up through the real /auth/signup/ route', () => {
    expect(src).toMatch(/withBase\(['"]\/auth\/signup\/['"]\)/);
  });
});

describe('help.astro content', () => {
  const src = PAGES.help!;
  it('ports the real hero copy', () => {
    expect(src).toMatch(/How can we help/);
  });
  it('renders FAQs as native <details> (no JS accordion/search)', () => {
    expect(src).toMatch(/<details/);
  });
});
