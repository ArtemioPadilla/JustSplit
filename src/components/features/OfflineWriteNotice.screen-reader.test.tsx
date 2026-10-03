// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OFFLINE_SENTENCE, restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { readAll, speakFocused, spokenWith, trackAnnouncements } from '@/tests/screen-reader';
import { useCanWrite } from '@/lib/use-can-write';
import { OfflineWriteNotice } from './OfflineWriteNotice';

/**
 * Plan B19d, layer 1: what a screen reader is told by a blocked write control
 * (plan B19c, ADR 0015). The surface is the real settlements row: two "Record
 * payment" triggers that share the page's one connection state and one sentence.
 *
 * Behavior contracts:
 *  - offline, the sentence is reachable (read once in the document, whatever the
 *    number of controls) and each blocked control is spoken as disabled together
 *    with that sentence as its description;
 *  - the sentence is NOT a live region: the layout's OfflineBanner owns the
 *    announcement of the change, so N controls never mean N announcements;
 *  - online again, the control is spoken as an ordinary button and the sentence is gone.
 */
vi.mock('@/lib/currency/useDisplayConversion', () => ({
  useDisplayConversion: () => ({ convert: (amount: number) => amount, ready: true, approximate: false, rates: {}, refresh: vi.fn() }),
}));
vi.mock('@/stores/notifications', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

const { RecordPaymentDialog } = await import('./settlements/RecordPaymentDialog');

beforeAll(async () => {
  await Promise.all([import('./settlements/RecordPaymentDialogImpl'), import('./settlements/RecordPaymentForm')]);
}, 60_000);

const NAMES = { u1: 'Ana', u2: 'Beto', u3: 'Caro' };

function Page() {
  const write = useCanWrite();
  return (
    <main>
      <h1>Settle up</h1>
      <ul aria-label="Suggested payments">
        <li>
          <RecordPaymentDialog suggestion={{ fromUser: 'u1', toUser: 'u2', amount: 30 }} displayCurrency="USD" viewerId="u1" names={NAMES} write={write} />
        </li>
        <li>
          <RecordPaymentDialog suggestion={{ fromUser: 'u1', toUser: 'u3', amount: 12 }} displayCurrency="USD" viewerId="u1" names={NAMES} write={write} />
        </li>
      </ul>
      <OfflineWriteNotice write={write} />
    </main>
  );
}

let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;
beforeEach(async () => {
  announcements = await trackAnnouncements();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Page />
    </QueryClientProvider>,
  );
  await announcements.settled();
});
afterEach(() => {
  announcements.stop();
  restoreOnLine();
});

describe('a blocked write control, offline', () => {
  it('is reachable: the sentence is read once, however many controls share it', async () => {
    setOnLine(false);
    const phrases = await readAll();
    expect(phrases.filter((phrase) => phrase === OFFLINE_SENTENCE)).toHaveLength(1);
  });

  it('is spoken as unavailable, together with the reason', async () => {
    setOnLine(false);
    const trigger = screen.getByRole('button', { name: 'Record payment from you to Beto' });
    trigger.focus();
    const spoken = await speakFocused();
    expect(spoken).toContain('Record payment from you to Beto');
    expect(spoken).toContain(OFFLINE_SENTENCE);
    expect(spoken).toMatch(/\bdisabled\b/);
  });

  it('describes every control with the same sentence', async () => {
    setOnLine(false);
    for (const name of ['Record payment from you to Beto', 'Record payment from you to Caro']) {
      screen.getByRole('button', { name }).focus();
      expect(await speakFocused()).toContain(OFFLINE_SENTENCE);
    }
  });

  it('is not announced through a live region, so it is never announced once per control', async () => {
    setOnLine(false);
    await announcements.settled();
    expect(announcements.log.filter((entry) => entry.text.includes(OFFLINE_SENTENCE))).toEqual([]);
    expect(announcements.problems()).toEqual([]);
  });
});

describe('when the connection returns', () => {
  it('speaks the control as an ordinary button again and the sentence is gone', async () => {
    setOnLine(false);
    setOnLine(true);
    const trigger = screen.getByRole('button', { name: 'Record payment from you to Beto' });
    trigger.focus();
    const spoken = await speakFocused();
    expect(spoken).not.toMatch(/\bdisabled\b/);
    expect(spoken).not.toContain(OFFLINE_SENTENCE);
    expect(spokenWith(await readAll(), OFFLINE_SENTENCE)).toBe(false);
    expect(trigger).not.toHaveAttribute('aria-disabled');
  });

  it('while online nothing is described or disabled from the start', async () => {
    screen.getByRole('button', { name: 'Record payment from you to Beto' }).focus();
    const spoken = await speakFocused();
    expect(spoken).not.toMatch(/\bdisabled\b/);
  });
});
