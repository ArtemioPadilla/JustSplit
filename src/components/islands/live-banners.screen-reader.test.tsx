// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { $needsRefresh } from '@/stores/install';
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
 *  - when the state ends the text goes and nothing is announced; the next time
 *    it is announced again, once.
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

  it('says nothing when the connection returns, and announces the next outage once more', async () => {
    render(<OfflineBanner />);
    await announcements.settled();
    setOnLine(false);
    await announcements.settled();
    setOnLine(true);
    const afterReturn = await announcements.settled();
    expect(afterReturn).toHaveLength(1);
    expect(statusRegions()[0]).toBeEmptyDOMElement();

    setOnLine(false);
    // Two outages back to back inside this test are announced twice on purpose, so no `problems()` here:
    // the double-announcement window is for one event, not for a person toggling their wifi.
    expect(await announcements.settled()).toHaveLength(2);
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
