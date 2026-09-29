import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Cross-document View Transitions (`@view-transition { navigation: auto }` in
 * global.css) reject their `ready` / `finished` / `updateCallbackDone` promises
 * when Chromium aborts a transition — e.g. a navigation starts before the
 * previous one settled, or the other document doesn't opt in ("Transition was
 * aborted because of invalid state. ViewTransition opt-in disabled"). Nobody
 * awaits those promises, so each abort surfaced as an unhandled rejection: a
 * console error for real users and a `pageerror` that failed the A7 live smoke.
 *
 * BaseLayout installs an inline, parser-blocking guard in <head> (it must run
 * before `pagereveal`, which can fire before deferred module scripts) that
 * handles those promises on both sides of the navigation. An aborted
 * transition is expected and harmless: the navigation itself still happens.
 */
const layout = readFileSync(join(process.cwd(), 'src/layouts/BaseLayout.astro'), 'utf8');

function guardScript(): string {
  const match = layout.match(/<script is:inline>((?:(?!<\/script>)[\s\S])*?pagereveal[\s\S]*?)<\/script>/);
  if (!match) throw new Error('no inline view-transition guard in BaseLayout.astro');
  return match[1]!;
}

type Listener = (event: { viewTransition?: Record<string, Promise<unknown>> | null }) => void;

function install(): Record<string, Listener> {
  const listeners: Record<string, Listener> = {};
  const fakeWindow = { addEventListener: (type: string, fn: Listener) => void (listeners[type] = fn) };
  new Function('window', 'addEventListener', guardScript())(fakeWindow, fakeWindow.addEventListener);
  return listeners;
}

const unhandled: unknown[] = [];
const onUnhandled = (reason: unknown) => unhandled.push(reason);

afterEach(() => {
  process.off('unhandledRejection', onUnhandled);
  unhandled.length = 0;
});

describe('BaseLayout view-transition guard', () => {
  it('is an inline script in <head>, right after the zero-flash theme script', () => {
    const head = layout.slice(0, layout.indexOf('</head>'));
    expect(head).toMatch(/<script is:inline>[\s\S]*pagereveal[\s\S]*<\/script>/);
  });

  it.each(['pageswap', 'pagereveal'])('handles every rejected promise of an aborted transition on %s', async (type) => {
    process.on('unhandledRejection', onUnhandled);
    const listeners = install();
    expect(listeners[type]).toBeTypeOf('function');
    const aborted = () => Promise.reject(new DOMException('Transition was aborted because of invalid state', 'InvalidStateError'));
    listeners[type]!({ viewTransition: { ready: aborted(), finished: aborted(), updateCallbackDone: aborted() } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(unhandled).toEqual([]);
  });

  it('ignores events with no view transition (older browsers, reduced setups)', () => {
    const listeners = install();
    expect(() => listeners.pagereveal!({ viewTransition: null })).not.toThrow();
    expect(() => listeners.pageswap!({})).not.toThrow();
  });
});
