// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * `DeleteGroupDialog` (plan B12, risk:high) — the group detail island's
 * two-step delete confirm. `repos.groups.remove`'s own checks run
 * underneath (admin-only, honest post-delete verification; the friendship
 * preflight is gone since B2d, ADR 0013 — the foreign key ungroups the rows);
 * this component maps each typed error to an honest, specific message rather
 * than one generic "something went wrong" for every case.
 */
function stubLocationAssign() {
  const real = window.location;
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...real, assign } });
  return { assign, restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }) };
}

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { useDeleteGroup } = vi.hoisted(() => ({ useDeleteGroup: vi.fn() }));
vi.mock('@/lib/data/hooks/useDeleteGroup', () => ({ useDeleteGroup }));

const { GroupDeleteVerificationFailedError } = await import('@/lib/data/repos/groups');
const { DeleteGroupDialog } = await import('./DeleteGroupDialog');

let deleteMutateAsync: ReturnType<typeof vi.fn>;
let location: ReturnType<typeof stubLocationAssign>;

beforeEach(() => {
  location = stubLocationAssign();
  deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
  useDeleteGroup.mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false });
});

afterEach(() => {
  location.restore();
  vi.clearAllMocks();
});

async function openAndConfirm() {
  await userEvent.click(screen.getByRole('button', { name: /delete group/i }));
  await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));
}

describe('DeleteGroupDialog', () => {
  it('calls useDeleteGroup and redirects to /groups/list on success', async () => {
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await openAndConfirm();

    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/groups/list'));
    // Plan B17b amendment (cross-navigation toasts): notify-then-navigate
    // is a full page load in this static MPA — afterNavigation queues it.
    expect(notifySuccess).toHaveBeenCalledWith('Group deleted', expect.objectContaining({ afterNavigation: true }));
  });

  it('shows the honest post-write verification-failure message, without redirecting', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new GroupDeleteVerificationFailedError('g1'));
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await openAndConfirm();

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/could not be deleted/i)));
    // The group's rows were NOT touched (the foreign key only acts when the row goes), so the message must not claim they were.
    expect(notifyError).not.toHaveBeenCalledWith(expect.stringMatching(/ungrouped/i));
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('falls back to a generic message for an unrecognized failure', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new Error('network down'));
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await openAndConfirm();

    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not delete this group'));
    expect(location.assign).not.toHaveBeenCalled();
  });
});

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx` for the contract; a delete is the write that must never half-apply. */
describe('DeleteGroupDialog — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('the trigger is blocked and explained offline and opens nothing; it opens again on reconnect', async () => {
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    setOnLine(false);
    const trigger = screen.getByRole('button', { name: /delete group/i });
    expectBlocked(trigger);
    expect(visibleNotices()).toHaveLength(1);
    await userEvent.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setOnLine(true);
    expectWritable(trigger);
    await userEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('a dialog open when the connection drops blocks Delete, deletes nothing, and works on reconnect', async () => {
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await userEvent.click(screen.getByRole('button', { name: /delete group/i }));
    const confirm = await screen.findByRole('button', { name: /^delete$/i });

    setOnLine(false);
    expectBlocked(confirm);
    await userEvent.click(confirm);
    expect(deleteMutateAsync).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();

    setOnLine(true);
    expectWritable(confirm);
    await userEvent.click(confirm);
    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith('g1'));
  });

  it('a connection that drops mid-delete shows the plain failure, never success, and does not navigate', async () => {
    deleteMutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await openAndConfirm();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not delete this group'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    deleteMutateAsync.mockRejectedValueOnce(new OfflineWriteError());
    render(<DeleteGroupDialog groupId="g1" name="Roommates" />);
    await openAndConfirm();
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
