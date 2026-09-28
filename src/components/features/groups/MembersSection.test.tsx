// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpenseGroup } from '@/schemas/group';

/**
 * `MembersSection` (plan B12, risk:high) — the group detail island's
 * member list + admin-only management: role badges for everyone; for an
 * admin viewer, "Add members" (accepted friends not already in the group)
 * and a per-member "Remove" that preflight-blocks (a) a member still on
 * any group expense/event (`memberRemovalBlockerCount`) and (b) the sole
 * remaining admin (`isLastAdmin`) — both UX-only, `guard_expense_groups`
 * is the actual authority. A non-admin viewer sees no management controls
 * at all.
 */
const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { useUpdateGroup } = vi.hoisted(() => ({ useUpdateGroup: vi.fn() }));
vi.mock('@/lib/data/hooks/useUpdateGroup', () => ({ useUpdateGroup }));

const { MembersSection } = await import('./MembersSection');

const NOW = '2026-09-28T00:00:00.000Z';

function group(overrides: Partial<ExpenseGroup> = {}): ExpenseGroup {
  return {
    id: 'g1',
    name: 'Roommates',
    type: 'friends',
    currency: 'USD',
    members: [
      { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
      { userId: 'u2', displayName: 'Beto', role: 'member', joinedAt: NOW },
    ],
    totalExpenses: 0,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

let updateMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  updateMutateAsync = vi.fn().mockResolvedValue(undefined);
  useUpdateGroup.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('MembersSection', () => {
  it('shows every member with a role badge', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[]}
        groupEvents={[]}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.getByText('member')).toBeInTheDocument();
  });

  it('a non-admin viewer sees no "Add members" trigger and no "Remove" buttons', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[]}
        groupEvents={[]}
        uid="u2"
        friendCandidates={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /add members/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('an admin removing a member with no blocking rows calls useUpdateGroup with the recomputed patch', async () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[]}
        groupEvents={[]}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /remove beto/i }));
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));

    await waitFor(() =>
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'g1',
        patch: { members: [group().members[0]], memberIds: ['u1'], adminIds: ['u1'] },
      }),
    );
    expect(notifySuccess).toHaveBeenCalled();
  });

  it('preflight-blocks removing a member still on a group expense, with an honest inline message', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[{ id: 'e1', memberIds: ['u1', 'u2'] } as never]}
        groupEvents={[]}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(screen.getByText(/beto is still part of 1 expense/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove beto/i })).not.toBeInTheDocument();
  });

  it('never lets the sole admin remove themselves', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[]}
        groupEvents={[]}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(screen.queryByRole('button', { name: /remove ana/i })).not.toBeInTheDocument();
    expect(screen.getByText(/last admin/i)).toBeInTheDocument();
  });

  it('offers only accepted-friend candidates (not already members) in the "Add members" dialog, and adds the checked one', async () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        groupExpenses={[]}
        groupEvents={[]}
        uid="u1"
        friendCandidates={[{ id: 'u3', name: 'Caro' }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /add members/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caro' }));
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    const call = updateMutateAsync.mock.calls[0][0];
    expect(call.id).toBe('g1');
    expect(call.patch.memberIds).toEqual(['u1', 'u2', 'u3']);
    expect(call.patch.members[2]).toMatchObject({ userId: 'u3', displayName: 'Caro', role: 'member', invitedBy: 'u1' });
  });
});
