// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpenseGroup } from '@/schemas/group';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * `MembersSection` (plan B12, risk:high) — the group detail island's
 * member list + admin-only management: role badges for everyone; for an
 * admin viewer, "Add members" (accepted friends not already in the group)
 * and a per-member "Remove" that preflight-blocks the sole remaining admin
 * (`isLastAdmin`) — UX-only, `guard_expense_groups` is the actual authority. A
 * non-admin viewer sees no management controls at all. Since B2d (ADR 0013)
 * removing a member no longer locks the rows that still name them, so there is
 * no "still part of N expenses" block and the component takes no rows.
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
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Beto')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('a non-admin viewer sees no "Add members" trigger and no "Remove" buttons', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
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

  it('offers Remove for a member who is still named on group rows: removal no longer locks them (ADR 0013)', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(screen.getByRole('button', { name: /remove beto/i })).toBeInTheDocument();
    expect(screen.queryByText(/still part of/i)).not.toBeInTheDocument();
  });

  it('never lets the sole admin remove themselves', () => {
    render(
      <MembersSection
        group={group()}
        names={{ u1: 'Ana', u2: 'Beto' }}
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

/** Plan B19c (risk:high, ADR 0015): membership changes are writes; see `ExpenseForm.test.tsx` for the contract. */
describe('MembersSection — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  function renderAdmin() {
    return render(
      <MembersSection group={group()} names={{ u1: 'Ana', u2: 'Beto' }} uid="u1" friendCandidates={[{ id: 'u3', name: 'Caro' }]} />,
    );
  }

  it('blocks Add members and Remove with one visible explanation, opens nothing, and re-enables on reconnect', async () => {
    renderAdmin();
    setOnLine(false);
    const add = screen.getByRole('button', { name: /add members/i });
    const remove = screen.getByRole('button', { name: /remove beto/i });
    expectBlocked(add);
    expectBlocked(remove);
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);

    await userEvent.click(add);
    await userEvent.click(remove);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setOnLine(true);
    expectWritable(add);
    expectWritable(remove);
    expect(visibleNotices()).toHaveLength(0);
    await userEvent.click(remove);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('a Remove dialog that is open when the connection drops blocks its confirm button, keeps the dialog, and works on reconnect', async () => {
    renderAdmin();
    await userEvent.click(screen.getByRole('button', { name: /remove beto/i }));
    const dialog = await screen.findByRole('dialog');

    setOnLine(false);
    const confirm = within(dialog).getByRole('button', { name: /^remove$/i });
    expectBlocked(confirm);
    expect(visibleNotices(dialog)).toHaveLength(1);
    await userEvent.click(confirm);
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    setOnLine(true);
    expectWritable(confirm);
    await userEvent.click(confirm);
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('an Add dialog blocks its confirm button offline and keeps the ticked friend', async () => {
    renderAdmin();
    await userEvent.click(screen.getByRole('button', { name: /add members/i }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Caro' }));

    setOnLine(false);
    const confirm = within(dialog).getByRole('button', { name: /^add$/i });
    expectBlocked(confirm);
    await userEvent.click(confirm);
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('checkbox', { name: 'Caro' })).toBeChecked();

    setOnLine(true);
    expectWritable(confirm);
    await userEvent.click(confirm);
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('a connection that drops mid-confirm shows the plain failure, never success', async () => {
    updateMutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    renderAdmin();
    await userEvent.click(screen.getByRole('button', { name: /remove beto/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not remove this member'));
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    updateMutateAsync.mockRejectedValueOnce(new OfflineWriteError());
    renderAdmin();
    await userEvent.click(screen.getByRole('button', { name: /remove beto/i }));
    await userEvent.click(await screen.findByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});

/**
 * Plan B19c (risk:high, ADR 0015): the badge comes from `admin_ids` (and `created_by` for the owner), never from
 * the stored `members[].role`, which any member can edit. A badge that says "Admin" for someone who is not one
 * misleads people; the reverse hides a real admin.
 */
describe('MembersSection — displayed role comes from admin_ids (plan B19c)', () => {
  function badges() {
    return screen.getAllByRole('listitem').map((item) => item.textContent);
  }

  it('a member whose stored role says admin but who is not in admin_ids shows as Member', () => {
    render(
      <MembersSection
        group={group({
          members: [
            { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
            { userId: 'u2', displayName: 'Beto', role: 'admin', joinedAt: NOW },
          ],
          adminIds: ['u1'],
        })}
        names={{ u1: 'Ana', u2: 'Beto' }}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(badges()[1]).toContain('Member');
    expect(badges()[1]).not.toMatch(/admin/i);
  });

  it('a member in admin_ids whose stored role says member shows as Admin', () => {
    render(
      <MembersSection
        group={group({
          members: [
            { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
            { userId: 'u2', displayName: 'Beto', role: 'member', joinedAt: NOW },
          ],
          adminIds: ['u1', 'u2'],
        })}
        names={{ u1: 'Ana', u2: 'Beto' }}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(badges()[1]).toContain('Admin');
  });

  it('the Owner is the creator (created_by), not whoever a label says: a forged owner label shows as Member', () => {
    render(
      <MembersSection
        group={group({
          members: [
            { userId: 'u1', displayName: 'Ana', role: 'admin', joinedAt: NOW },
            { userId: 'u2', displayName: 'Beto', role: 'owner', joinedAt: NOW },
          ],
          adminIds: ['u1'],
          createdBy: 'u1',
        })}
        names={{ u1: 'Ana', u2: 'Beto' }}
        uid="u1"
        friendCandidates={[]}
      />,
    );
    expect(badges()[0]).toContain('Owner');
    expect(badges()[1]).toContain('Member');
    expect(screen.getAllByText('Owner')).toHaveLength(1);
  });

  it('adding a member does not promote someone whose label was forged: admin_ids in the patch is unchanged', async () => {
    render(
      <MembersSection
        group={group({
          members: [
            { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
            { userId: 'u2', displayName: 'Beto', role: 'admin', joinedAt: NOW },
          ],
          adminIds: ['u1'],
        })}
        names={{ u1: 'Ana', u2: 'Beto' }}
        uid="u1"
        friendCandidates={[{ id: 'u3', name: 'Caro' }]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /add members/i }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caro' }));
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    const { patch } = updateMutateAsync.mock.calls[0][0];
    expect(patch.adminIds).toEqual(['u1']);
    expect(patch.members.map((m: { userId: string; role: string }) => [m.userId, m.role])).toEqual([
      ['u1', 'owner'],
      ['u2', 'member'],
      ['u3', 'member'],
    ]);
  });
});
