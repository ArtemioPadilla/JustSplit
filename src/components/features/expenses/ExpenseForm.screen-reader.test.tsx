// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import { Toaster } from '@/components/ui/toast';
import { $authReady, $profile, $user } from '@/stores/session';
import { readAll, speakFocused, spokenWith, trackAnnouncements } from '@/tests/screen-reader';

/**
 * Plan B19d, layer 1: what a screen reader is told when the expense form refuses a
 * submit. The data layer is mocked as in `ExpenseForm.test.tsx`; notifications and
 * the Toaster are REAL, because for the splitter's sum gate the announcement IS the
 * error toast.
 *
 * Behavior contracts:
 *  - a field error leaves focus on the first invalid field, spoken with its name, as
 *    invalid and with its message as the description;
 *  - the messages are not also live regions (each would be said twice);
 *  - a cross-field refusal (shares that do not add up) is announced ONCE, as an
 *    assertive alert that says the save was refused and what is left, in words of its
 *    own: the splitter's polite status already says "$20.00 left to assign" as the person
 *    types, and the same sentence from a second live region would be a double announcement;
 *    focus stays where the person was.
 */
const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { generateId } = vi.hoisted(() => ({ generateId: vi.fn(() => 'new-id') }));
vi.mock('@/lib/data/repos/expenses', () => ({ generateId }));

const { useGroup, useEvent, useFriends, useProfiles, useCreateExpenseWithReceipts, useUpdateExpense, useAddReceipts, useRemoveReceipt } =
  vi.hoisted(() => ({
    useGroup: vi.fn(),
    useEvent: vi.fn(),
    useFriends: vi.fn(),
    useProfiles: vi.fn(),
    useCreateExpenseWithReceipts: vi.fn(),
    useUpdateExpense: vi.fn(),
    useAddReceipts: vi.fn(),
    useRemoveReceipt: vi.fn(),
  }));
vi.mock('@/lib/data/hooks/useGroup', () => ({ useGroup }));
vi.mock('@/lib/data/hooks/useEvent', () => ({ useEvent }));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useCreateExpenseWithReceipts', () => ({ useCreateExpenseWithReceipts }));
vi.mock('@/lib/data/hooks/useUpdateExpense', () => ({ useUpdateExpense }));
vi.mock('@/lib/data/hooks/useAddReceipts', () => ({ useAddReceipts }));
vi.mock('@/lib/data/hooks/useRemoveReceipt', () => ({ useRemoveReceipt }));

const { default: ExpenseForm } = await import('./ExpenseForm').then((m) => ({ default: m.ExpenseForm }));

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NAMES: Record<string, string> = { u1: 'Ana', u2: 'Beto' };

let announcements: Awaited<ReturnType<typeof trackAnnouncements>>;

beforeEach(async () => {
  announcements = await trackAnnouncements();
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);
  $preferredCurrency.set('USD');
  window.history.replaceState(null, '', '/expenses/new');
  useGroup.mockReturnValue({ data: undefined, isSuccess: false });
  useEvent.mockReturnValue({ data: undefined, isSuccess: false });
  useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' }], isSuccess: true });
  useProfiles.mockImplementation((ids: string[]) => ({ data: ids.map((id) => ({ id, name: NAMES[id] ?? id, avatarUrl: null })), isError: false }));
  useCreateExpenseWithReceipts.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useUpdateExpense.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useAddReceipts.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useRemoveReceipt.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

afterEach(() => {
  announcements.stop();
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

async function renderForm() {
  render(
    <>
      <ExpenseForm mode="create" />
      <Toaster />
    </>,
  );
  await screen.findByRole('checkbox', { name: 'Ana' });
  await announcements.settled();
}

describe('ExpenseForm: a submit with invalid fields', () => {
  it('leaves focus on the first invalid field, spoken as invalid with its message', async () => {
    await renderForm();
    await userEvent.setup().click(screen.getByRole('button', { name: /save expense/i }));
    await screen.findByText(/description is required/i);

    expect(document.activeElement).toBe(screen.getByLabelText(/description/i));
    const spoken = await speakFocused();
    expect(spoken).toContain('Description');
    expect(spoken).toContain('invalid');
    expect(spoken).toMatch(/description is required/i);
  });

  it('moves to the amount once the description is fine', async () => {
    await renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.click(screen.getByRole('button', { name: /save expense/i }));
    await waitFor(() => expect(screen.getByLabelText(/^amount$/i)).toHaveAttribute('aria-invalid', 'true'));

    expect(document.activeElement).toBe(screen.getByLabelText(/^amount$/i));
    expect(await speakFocused()).toContain('invalid');
  });

  it('does not announce the field messages through a live region as well', async () => {
    await renderForm();
    const before = announcements.log.length;
    await userEvent.setup().click(screen.getByRole('button', { name: /save expense/i }));
    await screen.findByText(/description is required/i);
    await announcements.settled();
    expect(announcements.log.slice(before)).toEqual([]);
  });
});

describe('ExpenseForm: loading', () => {
  it('announces no validation message before the person has done anything, then says the split is balanced', async () => {
    // The friends query has not answered yet: nobody is selected, which is "loading", not "invalid".
    useFriends.mockReturnValue({ data: undefined, isSuccess: false });
    const view = render(
      <>
        <ExpenseForm mode="create" />
        <Toaster />
      </>,
    );
    await announcements.settled();
    expect(announcements.log.filter((entry) => /select at least one participant/i.test(entry.text))).toEqual([]);

    useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' }], isSuccess: true });
    view.rerender(
      <>
        <ExpenseForm mode="create" />
        <Toaster />
      </>,
    );
    await screen.findByRole('checkbox', { name: 'Ana' });
    const log = await announcements.settled();

    expect(log.filter((entry) => /select at least one participant/i.test(entry.text))).toEqual([]);
    expect(log.filter((entry) => /balanced/i.test(entry.text))).toHaveLength(1);
    expect(announcements.problems()).toEqual([]);
  });
});

describe('ExpenseForm: shares that do not add up', () => {
  it('is announced once, assertively, naming what is left, without moving focus off the button', async () => {
    await renderForm();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('radio', { name: /exact amounts/i }));
    await user.type(screen.getByLabelText(/Ana.?s share/i), '40');
    await user.type(screen.getByLabelText(/Beto.?s share/i), '40');
    await announcements.settled();
    const before = announcements.log.length;

    const save = screen.getByRole('button', { name: /save expense/i });
    await user.click(save);
    await screen.findAllByText(/left to assign/i);
    const fresh = (await announcements.settled()).slice(before).filter((entry) => /left to assign/i.test(entry.text));

    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toMatchObject({ politeness: 'assertive' });
    // As a toast on its own, with the splitter's status out of sight, it must say that the save was refused
    // and why, not just a bare amount; and it is not the same sentence the splitter's polite status already says.
    expect(fresh[0]!.text).toMatch(/^can.?t save yet: \$20\.00 left to assign/i);
    expect(document.activeElement).toBe(save);
    const phrases = await readAll();
    expect(phrases).toContain('alert');
    expect(spokenWith(phrases, 'left to assign')).toBe(true);
    // The splitter keeps its own polite running total; it must not repeat the toast's sentence.
    expect(announcements.problems()).toEqual([]);
  });
});
