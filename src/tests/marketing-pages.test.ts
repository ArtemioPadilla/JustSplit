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

/**
 * Plan B20a: the help copy follows the PUBLIC_AUTH_GOOGLE build flag. The page is
 * static, so the Google sentence is chosen at build time: every line that names
 * Google goes through isGoogleSignInEnabled(), and the always-on text names email only.
 */
describe('help.astro Google sign-in copy follows the build flag (plan B20a)', () => {
  const src = PAGES.help!;
  it('imports the flag helper', () => {
    expect(src).toMatch(/import\s*\{[^}]*isGoogleSignInEnabled[^}]*\}\s*from\s*['"][^'"]*auth-providers['"]/);
  });

  it('mentions Google only inside a branch on the flag', () => {
    const lines = src.split('\n').filter((line) => /google/i.test(line));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line, line.trim()).toMatch(/isGoogleSignInEnabled|googleSignIn/);
  });

  it('the account answer still offers email sign-up when the flag is off', () => {
    expect(src).toMatch(/register with your email address/);
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

describe('support contact (no invented channels)', () => {
  it('no marketing page links an email address nobody monitors', () => {
    for (const [name, src] of Object.entries(PAGES)) {
      expect(src, name).not.toMatch(/mailto:/);
    }
  });

  it("help sends people to the repository's issue tracker, single-sourced from site-meta", () => {
    expect(PAGES.help!).toMatch(/REPO_URL/);
    expect(PAGES.help!).toMatch(/\/issues/);
  });
});

describe('no fabricated social proof (ethics checklist items 2 and 4)', () => {
  // Nothing in this project backs a user count, a founding date or customer
  // quotes. Unsupported claims presented as fact are deceptive; the pages
  // describe what the product does instead.
  it.each(['landing', 'about', 'help'])('%s makes no unverifiable user-count or founding-date claim', (name) => {
    const src = PAGES[name]!;
    expect(src).not.toMatch(/thousands of users|millions of users|\d[\d,.]*\+?\s*(users|customers|groups)/i);
    expect(src).not.toMatch(/since\s+(19|20)\d\d/i);
  });

  it('landing carries no invented testimonials', () => {
    expect(PAGES.landing!).not.toMatch(/testimonial|What our users say|<blockquote/i);
  });
});

describe('marketing copy matches the shipped product (no inaccurate claims)', () => {
  const all = Object.values(PAGES).join('\n');

  it('pricing: says it is free without implying a paid tier ("basic")', () => {
    expect(all).not.toMatch(/free for basic/i);
    expect(PAGES.landing).toMatch(/no paid plan/i);
    expect(PAGES.help).toMatch(/no paid plan/i);
  });

  it('split types: only the ones the expense form offers (equal, exact, percentage)', () => {
    expect(all).not.toMatch(/share-based/i);
  });

  it('participants are registered users only (ADR 0006) — no "non-registered participant" promise', () => {
    expect(all).not.toMatch(/non-registered participant/i);
  });

  it('names the real "Add expense" control, not an invented "+" action', () => {
    expect(PAGES.help).not.toMatch(/"\+" action/);
    expect(PAGES.help).toMatch(/Add expense/);
  });

  it('does not promise a "zero balance first" member-removal rule the app does not have', () => {
    expect(all).not.toMatch(/zero balance first/i);
  });
});
