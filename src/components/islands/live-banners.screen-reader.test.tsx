// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $needsRefresh } from '@/stores/install';
import { $online } from '@/stores/online';
import { restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { readAll, spokenWith, trackAnnouncements } from '@/tests/screen-reader';
import OfflineBanner from './OfflineBanner';
import UpdateToast from './UpdateToast';

/**
 * Plan B19d, layer 1: the two layout-level status banners, `OfflineBanner` and
 * `UpdateToast`, as a screen reader meets them.
 *
 * Behavior contracts, for each:
 *  - the polite status REGION is in the document before it has anything to say
 *    (empty), and the message is then ADDED to it. A live region that is created
 *    already holding its text is the pattern assistive technology announces least
 *    reliably (NVDA and JAWS often say nothing), so "announced" must not depend on it;
 *  - the message is announced once, politely, however many times the state is
 *    re-asserted (a second `offline` event, a re-render);
 *  - when the state ends the text goes; the next time it is announced again, once.
 *    (Reconnecting is announced too, see "coming back online" below.)
 */
let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;

beforeEach(async () => {
  announcements = await trackAnnouncements();
  $needsRefresh.set(false);
});
afterEach(() => {
  announcements.stop();
  restoreOnLine();
  $needsRefresh.set(false);
});

const statusRegions = () => Array.from(document.querySelectorAll<HTMLElement>('[role="status"]'));

describe('OfflineBanner', () => {
  it('keeps its polite status region in the document, empty, while online', async () => {
    render(<OfflineBanner />);
    await announcements.settled();
    const [region, ...others] = statusRegions();
    expect(others).toEqual([]);
    expect(region).toBeDefined();
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    expect(announcements.log).toEqual([]);
  });

  it('announces being offline once, politely, into a region that was already there', async () => {
    render(<OfflineBanner />);
    await announcements.settled();
    setOnLine(false);
    const log = await announcements.settled();

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'polite', text: expect.stringMatching(/offline/i), inserted: false });
    expect(announcements.problems()).toEqual([]);
    // A status has no name of its own: the reader speaks "status", then its content.
    const phrases = await readAll();
    expect(phrases).toContain('status');
    expect(spokenWith(phrases, "You're offline")).toBe(true);
  });

  it('does not announce again when the offline state is re-asserted', async () => {
    render(<OfflineBanner />);
    await announcements.settled();
    setOnLine(false);
    setOnLine(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await announcements.settled()).toHaveLength(1);
  });
});

/**
 * Reconnecting is announced (WCAG 4.1.3: a status change is announced, and offline/online are symmetric).
 * Behavior contracts:
 *  - "You're back online." is ADDED to the same standing polite status region, once, on a real
 *    offline -> online transition, never on a first load that is already online;
 *  - it shows as a visible pill and the text clears after about 4 s, announcing nothing when it clears;
 *  - flapping (offline, online, offline, online) never leaves a stale "back online", never announces a
 *    transition twice, and the timer of an earlier reconnect never clears a later message;
 *  - the timer is cleaned up on unmount.
 */
describe('OfflineBanner: coming back online', () => {
  const BACK = "You're back online.";
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  /** Advances the fake clock inside act and lets the observer's microtask run. */
  const tick = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  const texts = () => announcements.log.map((entry) => entry.text);

  it('announces nothing on a first load that is already online, or on a stray online event', async () => {
    render(<OfflineBanner />);
    await tick(10);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    await tick(10);
    expect(announcements.log).toEqual([]);
    expect(statusRegions()[0]).toBeEmptyDOMElement();
  });

  it('announces it once, politely, into the region that was already there, as a visible pill', async () => {
    render(<OfflineBanner />);
    await tick(10);
    setOnLine(false);
    await tick(10);
    setOnLine(true);
    await tick(10);

    expect(texts()).toEqual([expect.stringMatching(/offline/i), BACK]);
    expect(announcements.log[1]).toMatchObject({ politeness: 'polite', inserted: false });
    expect(screen.getByText(BACK)).toBeVisible();
    expect(statusRegions()).toHaveLength(1);
    expect(spokenWith(await readAll(), BACK)).toBe(true);
  });

  it('is not destructive-toned: the offline pill is, this one is neutral', async () => {
    render(<OfflineBanner />);
    setOnLine(false);
    await tick(10);
    const offlinePill = screen.getByText(/You're offline/).closest('div')!;
    expect(offlinePill.className).toMatch(/destructive/);
    setOnLine(true);
    await tick(10);
    const onlinePill = screen.getByText(BACK).closest('div')!;
    expect(onlinePill.className).not.toMatch(/destructive/);
  });

  it('clears the text after about 4 seconds and announces nothing when it clears', async () => {
    render(<OfflineBanner />);
    setOnLine(false);
    await tick(10);
    setOnLine(true);
    await tick(3900);
    expect(screen.getByText(BACK)).toBeInTheDocument();
    await tick(300);
    expect(statusRegions()[0]).toBeEmptyDOMElement();
    expect(texts()).toHaveLength(2);
  });

  it('flapping offline -> online -> offline leaves no stale message and announces each transition once', async () => {
    render(<OfflineBanner />);
    setOnLine(false);
    await tick(10);
    setOnLine(true);
    await tick(500);
    setOnLine(false);
    await tick(10);

    expect(screen.queryByText(BACK)).not.toBeInTheDocument();
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    // The first reconnect's timer must not fire into the outage.
    await tick(5000);
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    expect(texts()).toEqual([expect.stringMatching(/offline/i), BACK, expect.stringMatching(/offline/i)]);
  });

  it('a later reconnect keeps its full 4 seconds, whatever an earlier one scheduled', async () => {
    render(<OfflineBanner />);
    setOnLine(false);
    setOnLine(true);
    await tick(1000);
    setOnLine(false);
    await tick(1000);
    setOnLine(true);
    await tick(10);
    expect(screen.getByText(BACK)).toBeInTheDocument();
    // 3.5 s after the second reconnect is 5.5 s after the first, whose timer is long gone.
    await tick(3500);
    expect(screen.getByText(BACK)).toBeInTheDocument();
    await tick(600);
    expect(screen.queryByText(BACK)).not.toBeInTheDocument();
    expect(texts().filter((text) => text === BACK)).toHaveLength(2);
  });

  it('a page that loaded offline announces the reconnect (a real transition)', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    // What the store's onMount does on a real page load (here the store may already be mounted by an earlier
    // test: nanostores unmounts on a delayed timer, which the fake clock holds back).
    $online.set(false);
    render(<OfflineBanner />);
    await tick(10);
    expect(texts()).toEqual([expect.stringMatching(/offline/i)]);
    setOnLine(true);
    await tick(10);
    expect(texts()).toEqual([expect.stringMatching(/offline/i), BACK]);
  });

  it('cleans its timer up on unmount', async () => {
    const scheduled = vi.spyOn(globalThis, 'setTimeout');
    const cleared = vi.spyOn(globalThis, 'clearTimeout');
    const view = render(<OfflineBanner />);
    setOnLine(false);
    setOnLine(true);
    await tick(10);
    const backTimer = scheduled.mock.calls.findIndex(([, ms]) => ms === 4000);
    expect(backTimer).toBeGreaterThanOrEqual(0);
    const id = scheduled.mock.results[backTimer]!.value;
    expect(cleared).not.toHaveBeenCalledWith(id);
    view.unmount();
    expect(cleared).toHaveBeenCalledWith(id);
  });
});

describe('UpdateToast', () => {
  it('keeps its polite status region in the document, empty, until an update is waiting', async () => {
    render(<UpdateToast />);
    await announcements.settled();
    const [region, ...others] = statusRegions();
    expect(others).toEqual([]);
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
    expect(announcements.log).toEqual([]);
  });

  it('announces the update once, politely, into a region that was already there, and offers Reload', async () => {
    render(<UpdateToast />);
    await announcements.settled();
    act(() => {
      $needsRefresh.set(true);
    });
    const log = await announcements.settled();

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'polite', text: expect.stringContaining('Update available'), inserted: false });
    expect(announcements.problems()).toEqual([]);
    const phrases = await readAll();
    expect(phrases).toContain('status');
    expect(spokenWith(phrases, 'Update available')).toBe(true);
    expect(spokenWith(phrases, 'button', 'Reload')).toBe(true);
  });

  it('does not announce again on a re-render with the same state', async () => {
    const view = render(<UpdateToast />);
    act(() => {
      $needsRefresh.set(true);
    });
    await announcements.settled();
    view.rerender(<UpdateToast />);
    act(() => {
      $needsRefresh.set(true);
    });
    expect(await announcements.settled()).toHaveLength(1);
  });
});

describe('both banners together', () => {
  it('offline with an update waiting: two different sentences, each announced once, no region repeats another', async () => {
    render(
      <>
        <OfflineBanner />
        <UpdateToast />
      </>,
    );
    await announcements.settled();
    setOnLine(false);
    act(() => {
      $needsRefresh.set(true);
    });
    const log = await announcements.settled();

    expect(log).toHaveLength(2);
    expect(new Set(log.map((entry) => entry.regionKey)).size).toBe(2);
    expect(announcements.problems()).toEqual([]);
  });
});
