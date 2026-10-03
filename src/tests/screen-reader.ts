import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { virtual } from '@guidepup/virtual-screen-reader';
import { act } from '@testing-library/react';

/**
 * Plan B19d, layer 1: a virtual screen reader for the jsdom suites.
 *
 * `@guidepup/virtual-screen-reader` walks the accessibility tree of a jsdom
 * document the way a screen reader's virtual cursor does and records the phrases
 * it would speak ("button, Save expense, not pressed", "textbox, Email, <its
 * description>, invalid"). It computes roles, names, descriptions and states with
 * the same algorithms the browsers use (dom-accessibility-api), so a test can
 * assert what a person using a screen reader is TOLD, not only which attributes
 * are set. It does not model live regions (see `trackAnnouncements`), real speech
 * synthesis, or any particular screen reader's quirks: it never replaces the
 * manual NVDA / VoiceOver / TalkBack pass that plan B18 records.
 *
 * Tests assert on stable meaning (role + name + state, via `toContain` / `some`),
 * never on a whole log: the exact wording of unrelated phrases is not the contract.
 */

const MAX_STEPS = 500;

/** Every phrase the reader speaks walking `container` once, from the top to its end. */
export async function readAll(container: Element = document.body): Promise<string[]> {
  await virtual.start({ container });
  try {
    const phrases: string[] = [];
    for (let step = 0; step < MAX_STEPS; step++) {
      await virtual.next();
      phrases.push(await virtual.lastSpokenPhrase());
      // The cursor wraps back to the container after "end of ...": one full pass.
      if (virtual.activeNode === container) return phrases;
    }
    throw new Error(`the virtual screen reader did not reach the end of the document in ${MAX_STEPS} steps`);
  } finally {
    await virtual.stop();
  }
}

/**
 * What the reader speaks for the element that has keyboard focus: what a person
 * hears right after focus lands on it (name, role, state, description).
 */
export async function speakFocused(container: Element = document.body): Promise<string> {
  const focused = document.activeElement;
  if (!focused || focused === document.body) throw new Error('nothing has focus: there is nothing for a screen reader to speak');
  await virtual.start({ container });
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      await virtual.next();
      if (virtual.activeNode === focused) return await virtual.lastSpokenPhrase();
    }
    const where = focused.outerHTML.slice(0, 120);
    throw new Error(`the focused element is not in the accessibility tree (hidden, inert or aria-hidden?): ${where}`);
  } finally {
    await virtual.stop();
  }
}

/** True when some phrase contains every fragment, in any order (role, name, state). */
export function spokenWith(phrases: string[], ...fragments: string[]): boolean {
  return phrases.some((phrase) => fragments.every((fragment) => phrase.includes(fragment)));
}

export interface Announcement {
  at: number;
  doc: string;
  politeness: 'polite' | 'assertive';
  region: string;
  regionKey: number;
  text: string;
  inserted: boolean;
}

interface AnnouncementsModule {
  installLiveRegionObserver: (win?: Window) => { log: Announcement[]; disconnect: () => void };
  classifyAnnouncements: (entries: Announcement[]) => { kind: string; message: string }[];
}

const loadAnnouncements = async () =>
  (await import(/* @vite-ignore */ pathToFileURL(resolve(__dirname, '../../scripts/lib/live-announcements.mjs')).href)) as AnnouncementsModule;

/**
 * Live regions are what a screen reader speaks WITHOUT being navigated to, and the
 * virtual cursor does not model them. The live smoke's observer
 * (`scripts/lib/live-announcements.mjs`) does: the same module runs here on the
 * jsdom document, so a unit test and the real-browser run share one definition of
 * "announced". Start it BEFORE rendering, so regions that mount with the component are seen.
 */
export async function trackAnnouncements() {
  const { installLiveRegionObserver, classifyAnnouncements } = await loadAnnouncements();
  const { log, disconnect } = installLiveRegionObserver(window);
  return {
    log,
    /** Lets React commit and the observer's microtask deliver, then returns the log so far. */
    async settled(): Promise<Announcement[]> {
      await act(async () => {
        await new Promise<void>((done) => setTimeout(done, 0));
      });
      return log;
    },
    /** The double-announcement violations of what was announced so far (empty when none). */
    problems: () => classifyAnnouncements(log).map((v) => v.message),
    stop: disconnect,
  };
}
