// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// `location.assign` is non-configurable on jsdom's real Location object, but
// `location` itself as a property of `window` is (same precedent as
// `ExpenseListIsland.test.tsx`'s redirect test) — `stubLocationAssign()`
// snapshots the REAL location (so `window.history.replaceState` calls made
// BEFORE stubbing are preserved) and must be restored before the next
// test's own `history.replaceState` calls, or every later test silently
// stops seeing URL changes.
function stubLocationAssign() {
  const real = window.location;
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...real, assign } });
  return {
    assign,
    restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }),
  };
}
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Expense } from '@/schemas/expense';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * Plan B10 (risk:high). Covers: field validation, the splitter's sum gate
 * blocking submit, query-param defaults (`?group=`, plus an unresolved id
 * falling back with a notice), the create write ordering (generateId once,
 * `createWithReceipts` called with it, honest partial-failure toast, a
 * generic failure leaving the form's values intact), and edit mode's
 * partial patch never touching `settledAt`. Not-found for an unknown edit id
 * is `ExpenseEditView`'s own responsibility (`AppRouterIsland`'s route
 * view), not this shared form's.
 */
const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

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
const NAMES: Record<string, string> = { u1: 'Ana', u2: 'Beto', u3: 'Caro', u4: 'Dana', g1: 'Group' };

function profilesFor(ids: string[]) {
  return { data: ids.map((id) => ({ id, name: NAMES[id] ?? id, avatarUrl: null })), isError: false };
}

let createMutateAsync: ReturnType<typeof vi.fn>;
let updateMutateAsync: ReturnType<typeof vi.fn>;
let addReceiptsMutateAsync: ReturnType<typeof vi.fn>;
let removeReceiptMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);
  $preferredCurrency.set('USD');
  window.history.replaceState(null, '', '/expenses/new');

  useGroup.mockReturnValue({ data: undefined, isSuccess: false });
  useEvent.mockReturnValue({ data: undefined, isSuccess: false });
  useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' }], isSuccess: true });
  useProfiles.mockImplementation((ids: string[]) => profilesFor(ids));

  createMutateAsync = vi.fn().mockResolvedValue({ expense: { id: 'new-id', groupId: null }, failedUploadCount: 0 });
  useCreateExpenseWithReceipts.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false });

  updateMutateAsync = vi.fn().mockResolvedValue({ id: 'e1' });
  useUpdateExpense.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });

  addReceiptsMutateAsync = vi.fn().mockResolvedValue({ expense: { id: 'e1', images: [] }, failedUploadCount: 0 });
  useAddReceipts.mockReturnValue({ mutateAsync: addReceiptsMutateAsync, isPending: false });

  removeReceiptMutateAsync = vi.fn().mockResolvedValue({ id: 'e1', images: [] });
  useRemoveReceipt.mockReturnValue({ mutateAsync: removeReceiptMutateAsync, isPending: false });

  generateId.mockReturnValue('new-id');
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    groupId: null,
    description: 'Tacos',
    amount: 100,
    currency: 'USD',
    paidBy: 'u1',
    splitType: 'equal',
    splits: [
      { userId: 'u1', amount: 50 },
      { userId: 'u2', amount: 50 },
    ],
    date: '2026-05-01',
    memberIds: ['u1', 'u2'],
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: '2026-05-02T00:00:00.000Z',
    notes: '',
    images: [],
    ...overrides,
  };
}

describe('ExpenseForm — validation', () => {
  it('shows a required-field error and never calls the create mutation when description/amount are empty', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);
    await screen.findByRole('checkbox', { name: 'Ana' }); // wait for candidates to resolve

    await user.click(screen.getByRole('button', { name: /save expense/i }));

    expect(await screen.findByText(/description is required/i)).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — splitter sum gate', () => {
  it('refuses to submit an exact split whose shares do not sum to the amount', async () => {
    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('radio', { name: /exact amounts/i }));
    await user.type(screen.getByLabelText(/Ana.?s share/i), '40');
    await user.type(screen.getByLabelText(/Beto.?s share/i), '40');

    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/left to assign/i)));
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — query-param defaults', () => {
  it('?group= pre-selects the group members and currency', async () => {
    window.history.replaceState(null, '', '/expenses/new?group=g1');
    useGroup.mockReturnValue({
      data: { id: 'g1', memberIds: ['u1', 'u2'], currency: 'EUR', members: [], name: 'Trip', type: 'friends' },
      isSuccess: true,
    });

    render(<ExpenseForm mode="create" />);

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.getByLabelText(/Currency/i)).toHaveValue('EUR');
  });

  it('an unresolved ?group= id is ignored with a non-blocking notice, falling back to friends + self', async () => {
    window.history.replaceState(null, '', '/expenses/new?group=missing');
    useGroup.mockReturnValue({ data: null, isSuccess: true });

    render(<ExpenseForm mode="create" />);

    expect(await screen.findByText(/couldn't find that group/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
  });

  it('?event= belonging to a group is treated as a group expense: candidates + currency + payload come from the group (coordinator review)', async () => {
    window.history.replaceState(null, '', '/expenses/new?event=ev1');
    const location = stubLocationAssign();
    useEvent.mockReturnValue({ data: { id: 'ev1', memberIds: ['u1', 'u2'], groupId: 'g1', name: 'Trip' }, isSuccess: true });
    useGroup.mockReturnValue({
      data: { id: 'g1', memberIds: ['u1', 'u2', 'u3'], currency: 'EUR', members: [], name: 'Group', type: 'friends' },
      isSuccess: true,
    });

    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.getByLabelText(/Currency/i)).toHaveValue('EUR');

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const { input } = createMutateAsync.mock.calls[0]![0];
    expect(input.groupId).toBe('g1');
    expect(input.memberIds.slice().sort()).toEqual(['u1', 'u2', 'u3']);
    location.restore();
  });

  it('?event= with no group excludes non-friend members, shows a count-only notice, and never sends a payload the RLS policy would reject (coordinator review)', async () => {
    window.history.replaceState(null, '', '/expenses/new?event=ev1');
    const location = stubLocationAssign();
    useEvent.mockReturnValue({
      data: { id: 'ev1', memberIds: ['u1', 'u2', 'u3'], groupId: null, preferredCurrency: 'MXN', name: 'Party' },
      isSuccess: true,
    });
    // Only u2 is an accepted friend — u3 is not.
    useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' }], isSuccess: true });

    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Ana' })).toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Caro' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Currency/i)).toHaveValue('MXN');
    // Count only — never names (never reveal who).
    expect(screen.getByText(/1 person in this event isn't in your friends yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/Caro/)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const { input } = createMutateAsync.mock.calls[0]![0];
    expect(input.groupId).toBeNull();
    expect(input.memberIds).not.toContain('u3');
    location.restore();
  });
});

describe('ExpenseForm — no-group RLS invariant (defensive pre-submit check)', () => {
  it('blocks submit with a generic inline message when a participant stops being an accepted friend after being selected', async () => {
    window.history.replaceState(null, '', '/expenses/new?friend=u2');
    useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' }], isSuccess: true });

    const user = userEvent.setup();
    const { rerender } = render(<ExpenseForm mode="create" />);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked());

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');

    // The friendship is revoked out from under the already-selected participant
    // (e.g. a live query update) — the form's own selection state doesn't
    // auto-prune, which is exactly what the defensive invariant exists for.
    useFriends.mockReturnValue({ data: [{ users: ['u1', 'u2'], status: 'rejected', requestedBy: 'u1' }], isSuccess: true });
    rerender(<ExpenseForm mode="create" />);

    await user.click(screen.getByRole('button', { name: /save expense/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });
});

describe('ExpenseForm — edit mode blocked by the no-group friendship invariant', () => {
  it('shows an upfront notice and disables Save when the editor is not friends with everyone on a no-group expense', async () => {
    // No accepted friendship with u2 at all.
    useFriends.mockReturnValue({ data: [], isSuccess: true });
    const expense = makeExpense({ groupId: null, memberIds: ['u1', 'u2'], paidBy: 'u1', createdBy: 'u1' });

    render(<ExpenseForm mode="edit" expense={expense} />);

    expect(
      await screen.findByText(/only someone who is friends with everyone on it can edit it here/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('never blocks a group expense, regardless of friendship', async () => {
    useFriends.mockReturnValue({ data: [], isSuccess: true });
    const expense = makeExpense({ groupId: 'g1', memberIds: ['u1', 'u2'], paidBy: 'u1', createdBy: 'u1' });

    render(<ExpenseForm mode="edit" expense={expense} />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    expect(screen.queryByText(/only someone who is friends with everyone/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });
});

describe('ExpenseForm — create ordering', () => {
  it('generates the id once and calls createWithReceipts with it, then navigates to the detail page', async () => {
    const location = stubLocationAssign();
    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
    const call = createMutateAsync.mock.calls[0]![0];
    expect(call.id).toBe('new-id');
    expect(call.input).toMatchObject({ description: 'Tacos', amount: 100, createdBy: 'u1' });
    expect(generateId).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/expenses/new-id'));
    // Plan B17b amendment (cross-navigation toasts): this is a static MPA —
    // `location.assign` right after is a full page load that would discard
    // a toast fired synchronously before it. `afterNavigation: true` queues
    // it instead (drained by the next page's ToasterIsland).
    expect(notifySuccess).toHaveBeenCalledWith('Expense saved', expect.objectContaining({ afterNavigation: true }));
    location.restore();
  });

  it('reports a partial upload failure honestly, but still navigates to the detail page', async () => {
    createMutateAsync.mockResolvedValue({ expense: { id: 'new-id', groupId: null }, failedUploadCount: 1 });
    const location = stubLocationAssign();
    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() =>
      expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/couldn't be uploaded/i), expect.objectContaining({ afterNavigation: true })),
    );
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/expenses/new-id'));
    location.restore();
  });

  it('a failed insert shows a generic error and stays on the form with the typed values intact', async () => {
    createMutateAsync.mockRejectedValue(new Error('permission denied for table expenses'));
    const location = stubLocationAssign();
    const user = userEvent.setup();
    render(<ExpenseForm mode="create" />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.type(screen.getByLabelText(/description/i), 'Tacos');
    await user.type(screen.getByLabelText(/^amount$/i), '100');
    await user.click(screen.getByRole('button', { name: /save expense/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.not.stringMatching(/permission denied/i)));
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/description/i)).toHaveValue('Tacos');
    location.restore();
  });
});

describe('ExpenseForm — edit mode', () => {
  it('never includes settledAt in the update patch (a partial patch preserves it)', async () => {
    const location = stubLocationAssign();
    const expense = makeExpense();
    const user = userEvent.setup();
    render(<ExpenseForm mode="edit" expense={expense} />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    const call = updateMutateAsync.mock.calls[0]![0];
    expect(call.id).toBe('e1');
    expect(call.patch).not.toHaveProperty('settledAt');
    expect(call.patch.description).toBe('Tacos');
    location.restore();
  });

  it('re-materializes splits when the amount changes', async () => {
    const location = stubLocationAssign();
    const expense = makeExpense();
    const user = userEvent.setup();
    render(<ExpenseForm mode="edit" expense={expense} />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    const amountInput = screen.getByLabelText(/^amount$/i);
    await user.clear(amountInput);
    await user.type(amountInput, '200');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
    const { patch } = updateMutateAsync.mock.calls[0]![0];
    expect(patch.amount).toBe(200);
    const total = patch.splits.reduce((sum: number, s: { amount: number }) => sum + s.amount, 0);
    expect(total).toBeCloseTo(200);
    location.restore();
  });

  it('toasts success (afterNavigation) and navigates to the detail page', async () => {
    const location = stubLocationAssign();
    const expense = makeExpense();
    const user = userEvent.setup();
    render(<ExpenseForm mode="edit" expense={expense} />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/expenses/e1'));
    // Plan B17b amendment: edit-mode's save is the same "notify, then
    // location.assign" shape as create — queued so it survives the reload.
    expect(notifySuccess).toHaveBeenCalledWith('Expense saved', expect.objectContaining({ afterNavigation: true }));
    location.restore();
  });

  it('reports a partial upload failure honestly (afterNavigation), but still navigates to the detail page', async () => {
    addReceiptsMutateAsync.mockResolvedValue({ expense: { id: 'e1', images: [] }, failedUploadCount: 1 });
    const location = stubLocationAssign();
    const expense = makeExpense();
    const user = userEvent.setup();
    render(<ExpenseForm mode="edit" expense={expense} />);
    await screen.findByRole('checkbox', { name: 'Ana' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
    await user.upload(fileInput, file);
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/expenses/e1'));
    expect(notifyError).toHaveBeenCalledWith(
      expect.stringMatching(/couldn't be uploaded/i),
      expect.objectContaining({ afterNavigation: true }),
    );
    location.restore();
  });
});

describe('ExpenseForm — double submit', () => {
  it('disables the submit button with aria-busy while a mutation is pending', () => {
    useCreateExpenseWithReceipts.mockReturnValue({ mutateAsync: createMutateAsync, isPending: true });
    render(<ExpenseForm mode="create" />);
    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('ExpenseForm — heading ownership', () => {
  it('never renders its own <h1> — the mounting island/route view owns the page\'s one <h1> outside the auth gate (axe page-has-heading-one)', () => {
    render(<ExpenseForm mode="create" />);
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});
