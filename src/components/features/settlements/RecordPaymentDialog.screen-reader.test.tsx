// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OFFLINE_SENTENCE, restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { readAll, speakFocused, spokenWith, trackAnnouncements } from '@/tests/screen-reader';

/**
 * Plan B19d, layer 1: opening "Record payment" as a screen-reader user meets it
 * (Base UI dialog behind a load-on-first-use stand-in, plan B19b).
 *
 * Behavior contracts:
 *  - opening it speaks a dialog named "Record payment", and keyboard focus lands
 *    INSIDE it, on something that is spoken with a name (never on <body>);
 *  - the page behind a modal dialog is out of the accessibility tree, so the reader
 *    cannot wander off into it;
 *  - the opening is not also announced through a live region (a dialog is announced
 *    by the focus move; a status on top would say it twice);
 *  - Escape and Cancel close it and return focus to the trigger;
 *  - if the connection drops while it is open, its Save is spoken as disabled with the sentence.
 */
vi.mock('@/lib/currency/useDisplayConversion', () => ({
  useDisplayConversion: () => ({ convert: (amount: number) => amount, ready: true, approximate: false, rates: {}, refresh: vi.fn() }),
}));
vi.mock('@/stores/notifications', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/lib/data/repos/settlements', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/data/repos/settlements')>()), settle: vi.fn() }));

const { RecordPaymentDialog } = await import('./RecordPaymentDialog');

beforeAll(async () => {
  await Promise.all([import('./RecordPaymentDialogImpl'), import('./RecordPaymentForm')]);
}, 60_000);

let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;

beforeEach(async () => {
  announcements = await trackAnnouncements();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <main>
        <h1>Settle up</h1>
        <RecordPaymentDialog suggestion={{ fromUser: 'u1', toUser: 'u2', amount: 30 }} displayCurrency="USD" viewerId="u1" names={{ u1: 'Ana', u2: 'Beto' }} />
      </main>
    </QueryClientProvider>,
  );
  await announcements.settled();
});
afterEach(() => {
  announcements.stop();
  restoreOnLine();
});

async function open() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Record payment from you to Beto' }));
  const dialog = await screen.findByRole('dialog', { name: 'Record payment' });
  await within(dialog).findByLabelText('Amount');
  return { user, dialog };
}

describe('opening Record payment', () => {
  it('speaks a dialog named "Record payment" and puts focus on it (or inside it), never on the page behind', async () => {
    const { dialog } = await open();
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    expect(document.activeElement).not.toBe(document.body);

    // Focus lands on the dialog itself (Base UI focuses the popup): what is spoken is its role, its name
    // and its description, which is exactly what a person needs to hear when it opens.
    expect(spokenWith(await readAll(), 'dialog', 'Record payment')).toBe(true);
    const spoken = await speakFocused();
    expect(spoken).toContain('dialog');
    expect(spoken).toContain('Record payment');
    expect(spoken).toContain("JustSplit doesn't move money");
  });

  it('takes the page behind it out of the reader’s reach', async () => {
    await open();
    const phrases = await readAll();
    expect(spokenWith(phrases, 'heading', 'Settle up')).toBe(false);
    expect(spokenWith(phrases, 'dialog', 'Record payment')).toBe(true);
  });

  it('gives the dialog its form fields with names and a Save button', async () => {
    await open();
    const phrases = await readAll();
    expect(spokenWith(phrases, 'Amount')).toBe(true);
    expect(spokenWith(phrases, 'button', 'Save payment')).toBe(true);
    expect(spokenWith(phrases, 'button', 'Cancel')).toBe(true);
  });

  it('is not also announced through a live region', async () => {
    await open();
    await announcements.settled();
    expect(announcements.log.filter((entry) => /record payment/i.test(entry.text))).toEqual([]);
    expect(announcements.problems()).toEqual([]);
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { user, dialog } = await open();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Record payment from you to Beto' }));
    expect(await speakFocused()).toContain('Record payment from you to Beto');
  });

  it('closes on Cancel and gives focus back to the trigger', async () => {
    const { user, dialog } = await open();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Record payment from you to Beto' }));
  });
});

describe('Record payment when the connection drops while it is open', () => {
  it('speaks Save as disabled together with the sentence', async () => {
    const { dialog } = await open();
    setOnLine(false);
    const save = within(dialog).getByRole('button', { name: 'Save payment' });
    save.focus();
    const spoken = await speakFocused();
    expect(spoken).toContain('Save payment');
    expect(spoken).toMatch(/\bdisabled\b/);
    expect(spoken).toContain(OFFLINE_SENTENCE);
  });
});
