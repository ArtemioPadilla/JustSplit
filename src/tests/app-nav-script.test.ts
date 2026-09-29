// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The one inline script in SiteHeader.astro (plan B6b). The build marks the
 * current section of every static page with aria-current="page", but the
 * dynamic routes (/expenses/<id>, /friends/<id>, ...) are all served by
 * 404.html, whose build-time path is "/404": only the browser knows the URL.
 * The script marks those from the first path segment, matching each link's
 * `data-section` (the same rule as `sectionOfPath` in src/lib/app-nav.ts).
 * Run here exactly as shipped, against a fixture of the rendered nav.
 */
const header = readFileSync(resolve(__dirname, '..', 'components/common/SiteHeader.astro'), 'utf8');
const SCRIPT = /<script is:inline data-app-nav-script>([\s\S]*?)<\/script>/.exec(header)?.[1] ?? '';

const LINKS = [
  ['/', 'Dashboard', ''],
  ['/expenses/list', 'Expenses', 'expenses'],
  ['/events/list', 'Events', 'events'],
  ['/groups/list', 'Groups', 'groups'],
  ['/friends', 'Friends', 'friends'],
  ['/settlements', 'Settlements', 'settlements'],
] as const;

function mountNav(base: string, preMarked?: string) {
  const prefix = base.replace(/\/$/, '');
  document.body.innerHTML = `<nav aria-label="Main" data-app-nav data-base="${prefix}">${LINKS.map(
    ([href, label, section]) =>
      `<a href="${prefix}${href}" data-section="${section}"${label === preMarked ? ' aria-current="page"' : ''}>${label}</a>`,
  ).join('')}</nav>`;
}

function run(pathname: string) {
  history.replaceState(null, '', pathname);
  new Function(SCRIPT)();
  return [...document.querySelectorAll('a[aria-current]')].map((a) => a.textContent);
}

describe('SiteHeader app-nav inline script (plan B6b)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is present in SiteHeader.astro', () => {
    expect(SCRIPT.trim().length).toBeGreaterThan(0);
  });

  it('marks the section of a dynamic route the build could not know', () => {
    mountNav('/');
    expect(run('/expenses/abc123')).toEqual(['Expenses']);
    mountNav('/');
    expect(run('/events/edit/e1')).toEqual(['Events']);
    mountNav('/');
    expect(run('/groups/g1')).toEqual(['Groups']);
    mountNav('/');
    expect(run('/friends/f1')).toEqual(['Friends']);
  });

  it('honours a subpath base', () => {
    mountNav('/JustSplit');
    expect(run('/JustSplit/expenses/abc123')).toEqual(['Expenses']);
  });

  it('marks nothing for an unknown path, the 404 shell or Profile', () => {
    mountNav('/');
    expect(run('/nope/x')).toEqual([]);
    mountNav('/');
    expect(run('/404')).toEqual([]);
    mountNav('/');
    expect(run('/profile')).toEqual([]);
  });

  it('leaves a build-time mark alone (never marks a second link)', () => {
    mountNav('/', 'Settlements');
    expect(run('/settlements')).toEqual(['Settlements']);
  });

  it('never marks the dashboard for a deeper path (empty section matches only the root)', () => {
    mountNav('/');
    expect(run('/expensesx/1')).toEqual([]);
  });

  /**
   * Live finding at 375px: Chrome does not scroll a scroll container to a
   * focused child that is only PARTLY visible, so Tab landed on "Dashboard"
   * with 5px of it showing. Focus must bring the whole link into view.
   */
  it('brings a keyboard-focused link fully into view of the scrolling row', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mountNav('/');
    run('/expenses/list');
    scrollIntoView.mockClear();

    const settlements = [...document.querySelectorAll('nav a')].find((a) => a.textContent === 'Settlements')!;
    settlements.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(settlements);
    expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' });
  });
});
