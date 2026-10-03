// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { readAll, spokenWith, trackAnnouncements } from '@/tests/screen-reader';
import { Toaster } from './toast';

/**
 * Plan B19d, layer 1: what a screen reader is TOLD by a toast (the virtual screen
 * reader for the spoken phrases, the live-region observer for what is announced
 * without navigating). `toast.semantics.test.tsx` pins the attributes; this pins the
 * outcome, through the real `notifySuccess` / `notifyError` the islands use.
 *
 * Behavior contracts:
 *  - a success toast is announced ONCE, politely, with its title and description,
 *    and reads as a status;
 *  - an error toast is announced ONCE, assertively, and reads as an alert;
 *  - dismissing a toast, or a later toast, never re-announces an earlier one.
 */
let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;

beforeEach(async () => {
  announcements = await trackAnnouncements();
});
afterEach(() => {
  announcements.stop();
});

// Base UI hides the close button from assistive technology (aria-hidden) until the viewport is expanded by
// hover or focus, so it is found by its label, not by role.
const dismissButtons = () => Array.from(document.querySelectorAll<HTMLElement>('button[aria-label="Dismiss notification"]'));

const mount = async () => {
  render(<Toaster />);
  await announcements.settled();
};

describe('a success toast', () => {
  it('is announced once, politely, with its title and description', async () => {
    await mount();
    act(() => {
      notifySuccess('Expense saved', { description: 'Tacos was added.' });
    });
    await screen.findByText('Expense saved');
    const log = await announcements.settled();

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'polite', text: expect.stringContaining('Expense saved') });
    expect(log[0]!.text).toContain('Tacos was added.');
    expect(announcements.problems()).toEqual([]);
  });

  it('reads as a status holding both sentences, inside the Notifications region', async () => {
    await mount();
    act(() => {
      notifySuccess('Expense saved', { description: 'Tacos was added.' });
    });
    await screen.findByText('Expense saved');
    const phrases = await readAll();

    expect(spokenWith(phrases, 'region', 'Notifications')).toBe(true);
    expect(spokenWith(phrases, 'status', 'Expense saved', 'Tacos was added.')).toBe(true);
    expect(spokenWith(phrases, 'alert')).toBe(false);
    expect(spokenWith(phrases, 'dialog')).toBe(false);
  });
});

describe('an error toast', () => {
  it('is announced once, assertively', async () => {
    await mount();
    act(() => {
      notifyError('Could not save this expense. Please try again.');
    });
    await screen.findAllByText('Could not save this expense. Please try again.');
    const log = await announcements.settled();

    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'assertive', text: 'Could not save this expense. Please try again.' });
    expect(announcements.problems()).toEqual([]);
  });

  it('reads as an alert with the message', async () => {
    await mount();
    act(() => {
      notifyError('Could not save this expense. Please try again.');
    });
    await screen.findAllByText('Could not save this expense. Please try again.');
    const phrases = await readAll();

    expect(spokenWith(phrases, 'alert')).toBe(true);
    expect(phrases).toContain('Could not save this expense. Please try again.');
    expect(spokenWith(phrases, 'status')).toBe(false);
  });
});

describe('re-announcing', () => {
  it('a second toast announces only itself', async () => {
    await mount();
    act(() => {
      notifySuccess('Expense saved');
    });
    await screen.findByText('Expense saved');
    await announcements.settled();
    act(() => {
      notifyError('Could not remove this receipt.');
    });
    await screen.findAllByText('Could not remove this receipt.');
    const log = await announcements.settled();

    expect(log.map((entry) => entry.text)).toEqual(['Expense saved', 'Could not remove this receipt.']);
    expect(announcements.problems()).toEqual([]);
  });

  it('dismissing a toast announces nothing and takes it out of what is read', async () => {
    await mount();
    act(() => {
      notifySuccess('Expense saved');
    });
    await screen.findByText('Expense saved');
    await announcements.settled();
    const before = announcements.log.length;

    await userEvent.setup().click(dismissButtons()[0]!);
    await act(async () => {
      await new Promise((done) => setTimeout(done, 400));
    });
    await announcements.settled();

    expect(announcements.log).toHaveLength(before);
    expect(spokenWith(await readAll(), 'Expense saved')).toBe(false);
  });

  it('dismissing one of two toasts does not re-announce the other', async () => {
    await mount();
    act(() => {
      notifySuccess('First saved');
      notifySuccess('Second saved');
    });
    await screen.findByText('First saved');
    await screen.findByText('Second saved');
    await announcements.settled();
    const before = announcements.log.length;
    expect(before).toBeGreaterThan(0);

    await userEvent.setup().click(dismissButtons()[0]!);
    await act(async () => {
      await new Promise((done) => setTimeout(done, 400));
    });
    await announcements.settled();

    expect(announcements.log).toHaveLength(before);
    expect(announcements.problems()).toEqual([]);
  });
});
