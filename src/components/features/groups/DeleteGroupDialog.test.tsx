// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
