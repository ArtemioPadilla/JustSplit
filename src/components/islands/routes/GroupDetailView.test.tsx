// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { AuthUser } from '@cyber-eco/types';
import type { ExpenseGroup } from '@/schemas/group';
import { ExpenseGroupSchema } from '@/schemas/group';
import { $authReady, $profile, $user } from '@/stores/session';
import { OFFLINE_SENTENCE, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * `GroupDetailView` (plan B12, risk:high) — the `/groups/<id>` route view,
 * loaded lazily by `AppRouterIsland`. Same "mock the sub-components, prove
 * THIS view's own wiring" approach as `ExpenseFormIsland.test.tsx`:
 * `MembersSection`/`AttachRowsPanel`/`DeleteGroupDialog` each have their
 * own full behavior suite already — this file proves the not-found/
 * loading/error states, the totals-from-loaded-rows deviation (never
 * `totalExpenses`), the display-currency seed, the "Add expense" link,
 * admin-gated delete, and the props each sub-component receives.
 */
vi.mock('../AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useGroup, useGroupExpenses, useGroupEvents, useExpenses, useEvents, useFriends, useProfiles } = vi.hoisted(() => ({
  useGroup: vi.fn(),
  useGroupExpenses: vi.fn(),
  useGroupEvents: vi.fn(),
  useExpenses: vi.fn(),
  useEvents: vi.fn(),
  useFriends: vi.fn(),
  useProfiles: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useGroup', () => ({ useGroup }));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses, useGroupExpenses }));
vi.mock('@/lib/data/hooks/useEvents', () => ({ useEvents, useGroupEvents }));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));

const { MembersSection, AttachRowsPanel, DeleteGroupDialog } = vi.hoisted(() => ({
  MembersSection: vi.fn(() => <div data-testid="members-section" />),
  AttachRowsPanel: vi.fn(() => <div data-testid="attach-rows-panel" />),
  DeleteGroupDialog: vi.fn(() => <div data-testid="delete-group-dialog" />),
}));
vi.mock('@/components/features/groups/MembersSection', () => ({ MembersSection }));
vi.mock('@/components/features/groups/AttachRowsPanel', () => ({ AttachRowsPanel }));
vi.mock('@/components/features/groups/DeleteGroupDialog', () => ({ DeleteGroupDialog }));

const { default: GroupDetailView } = await import('./GroupDetailView');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NOW = '2026-09-28T00:00:00.000Z';

function makeGroup(overrides: Partial<ExpenseGroup> = {}): ExpenseGroup {
  return {
    id: 'g1',
    name: 'Roommates',
    type: 'friends',
    currency: 'USD',
    members: [
      { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
      { userId: 'u2', displayName: 'Beto', role: 'member', joinedAt: NOW },
    ],
    totalExpenses: 999,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);

  useExpenses.mockReturnValue({ data: [] });
  useEvents.mockReturnValue({ data: [] });
  useFriends.mockReturnValue({ data: [] });
  useProfiles.mockReturnValue({ data: [] });
  useGroupExpenses.mockReturnValue({ data: [] });
  useGroupEvents.mockReturnValue({ data: [] });
});

afterEach(() => {
  vi.clearAllMocks();
  $user.set(null);
  $authReady.set(false);
});

describe('GroupDetailView', () => {
  it('renders NotFoundView for an id that resolves to no row', () => {
    useGroup.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="does-not-exist" />);
    expect(screen.getByRole('heading', { level: 2, name: /not found/i })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1); // the view's own sr-only h1; the not-found heading is an h2 under it
  });

  it('shows a skeleton while loading', () => {
    useGroup.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);
    expect(screen.queryByText('Roommates')).not.toBeInTheDocument();
  });

  it('shows an error state with a retry on failure', () => {
    const refetch = vi.fn();
    useGroup.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(<GroupDetailView id="g1" />);
    screen.getByRole('button', { name: /retry/i }).click();
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the group name and an "Add expense" link to /expenses/new?group=<id>', () => {
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);
    expect(screen.getByText('Roommates')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add expense/i })).toHaveAttribute('href', '/expenses/new?group=g1');
  });

  it('seeds the display currency from group.currency, and totals the sum of the LOADED rows, never totalExpenses', async () => {
    useGroup.mockReturnValue({ data: makeGroup({ currency: 'USD', totalExpenses: 999 }), isLoading: false, isError: false, refetch: vi.fn() });
    useGroupExpenses.mockReturnValue({
      data: [
        { id: 'e1', groupId: 'g1', description: 'Tacos', amount: 30, currency: 'USD', paidBy: 'u1', splitType: 'equal', splits: [], date: '2026-09-28', memberIds: ['u1'], createdBy: 'u1', createdAt: NOW },
        { id: 'e2', groupId: 'g1', description: 'Pizza', amount: 20, currency: 'USD', paidBy: 'u1', splitType: 'equal', splits: [], date: '2026-09-28', memberIds: ['u1'], createdBy: 'u1', createdAt: NOW },
      ],
    });
    render(<GroupDetailView id="g1" />);

    expect(screen.getByLabelText(/display currency/i)).toHaveValue('USD');
    await waitFor(() => expect(screen.getByText('USD 50.00')).toBeInTheDocument());
    expect(screen.queryByText('999')).not.toBeInTheDocument();
  });

  it('shows DeleteGroupDialog only for an admin viewer', () => {
    useGroup.mockReturnValue({ data: makeGroup({ adminIds: ['u1'] }), isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);
    expect(screen.getByTestId('delete-group-dialog')).toBeInTheDocument();
  });

  it('hides DeleteGroupDialog for a non-admin viewer', () => {
    $user.set({ ...USER, uid: 'u2' });
    useGroup.mockReturnValue({ data: makeGroup({ adminIds: ['u1'] }), isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);
    expect(screen.queryByTestId('delete-group-dialog')).not.toBeInTheDocument();
  });

  it('passes only UNGROUPED, eligible rows to AttachRowsPanel', () => {
    useGroup.mockReturnValue({ data: makeGroup({ memberIds: ['u1', 'u2'] }), isLoading: false, isError: false, refetch: vi.fn() });
    useExpenses.mockReturnValue({
      data: [
        { id: 'e1', groupId: null, description: 'Attachable', amount: 10, currency: 'USD', paidBy: 'u1', splitType: 'equal', splits: [{ userId: 'u1', amount: 10 }], date: '2026-09-28', memberIds: ['u1'], createdBy: 'u1', createdAt: NOW },
        { id: 'e2', groupId: 'g-other', description: 'Already grouped', amount: 10, currency: 'USD', paidBy: 'u1', splitType: 'equal', splits: [{ userId: 'u1', amount: 10 }], date: '2026-09-28', memberIds: ['u1'], createdBy: 'u1', createdAt: NOW },
      ],
    });
    render(<GroupDetailView id="g1" />);

    expect(AttachRowsPanel).toHaveBeenCalledWith(
      expect.objectContaining({ groupId: 'g1', attachableExpenses: [{ id: 'e1', description: 'Attachable' }] }),
      undefined,
    );
  });

  it('never offers an ungrouped row that only names someone else (visible through an event): moving it into a group needs the actor on it (ADR 0013)', () => {
    useGroup.mockReturnValue({ data: makeGroup({ memberIds: ['u1', 'u2'] }), isLoading: false, isError: false, refetch: vi.fn() });
    useExpenses.mockReturnValue({
      data: [
        { id: 'e1', groupId: null, description: 'Mine', amount: 10, currency: 'USD', paidBy: 'u1', splitType: 'equal', splits: [{ userId: 'u1', amount: 10 }], date: '2026-09-28', memberIds: ['u1'], createdBy: 'u1', createdAt: NOW },
        { id: 'e3', groupId: null, description: 'Only names u2', amount: 10, currency: 'USD', paidBy: 'u2', splitType: 'equal', splits: [{ userId: 'u2', amount: 10 }], date: '2026-09-28', memberIds: ['u2'], createdBy: 'u2', createdAt: NOW, eventId: 'ev1' },
      ],
    });
    render(<GroupDetailView id="g1" />);

    expect(AttachRowsPanel).toHaveBeenCalledWith(
      expect.objectContaining({ attachableExpenses: [{ id: 'e1', description: 'Mine' }] }),
      undefined,
    );
  });

  // B19b: the RLS fixtures wrote role 'user' and the database accepted it; one such member used to
  // fail the parse and blank the page. Parsed through the real schema, the page renders and the
  // member is a plain 'member' (never an admin).
  it('renders a group whose stored member role is outside the enum, reading it as a plain member', () => {
    const group = ExpenseGroupSchema.parse({
      ...makeGroup(),
      members: [
        { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
        { userId: 'u2', displayName: 'Beto', role: 'user', joinedAt: NOW },
      ],
    });
    useGroup.mockReturnValue({ data: group, isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);

    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Roommates' })).toBeInTheDocument();
    const props = (MembersSection.mock.calls[0] as unknown[])[0] as { group: ExpenseGroup };
    expect(props.group.members.find((m) => m.userId === 'u2')?.role).toBe('member');
    expect(props.group.adminIds).toEqual(['u1']);
  });

  it('gives MembersSection no rows: removing a member no longer needs a "still on N expenses" preflight (ADR 0013)', () => {
    useGroup.mockReturnValue({ data: makeGroup({ memberIds: ['u1', 'u2'] }), isLoading: false, isError: false, refetch: vi.fn() });
    render(<GroupDetailView id="g1" />);

    const props = (MembersSection.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(props).not.toHaveProperty('groupExpenses');
    expect(props).not.toHaveProperty('groupEvents');
  });

  it('passes accepted friends who are NOT already members as MembersSection candidates', () => {
    useGroup.mockReturnValue({ data: makeGroup({ memberIds: ['u1', 'u2'] }), isLoading: false, isError: false, refetch: vi.fn() });
    useFriends.mockReturnValue({
      data: [
        { id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1', createdAt: NOW },
        { id: 'f2', users: ['u1', 'u3'], status: 'accepted', requestedBy: 'u1', createdAt: NOW },
      ],
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u3', name: 'Caro', avatarUrl: null }] });
    render(<GroupDetailView id="g1" />);

    expect(MembersSection).toHaveBeenCalledWith(
      expect.objectContaining({ friendCandidates: [{ id: 'u3', name: 'Caro' }] }),
      undefined,
    );
  });

  it('links "New event" to /events/new?group=<id> (plan B11b: the entry point of the events form\'s ?group= context), and offers it in the empty events state too', () => {
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isError: false, refetch: vi.fn() });
    useGroupEvents.mockReturnValue({ data: [] });
    render(<GroupDetailView id="g1" />);

    const links = screen.getAllByRole('link', { name: /new event/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
    for (const link of links) expect(link).toHaveAttribute('href', '/events/new?group=g1');
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
  });

  it('still links "New event" once the group has events', () => {
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isError: false, refetch: vi.fn() });
    useGroupEvents.mockReturnValue({ data: [{ id: 'ev1', name: 'Dinner', memberIds: ['u1'], kind: 'event', createdBy: 'u1', createdAt: NOW }] });
    render(<GroupDetailView id="g1" />);

    expect(screen.getByRole('link', { name: /new event/i })).toHaveAttribute('href', '/events/new?group=g1');
    expect(screen.getByRole('link', { name: 'Dinner' })).toHaveAttribute('href', '/events/ev1');
  });
});

/**
 * Plan B19c (risk:high, ADR 0015): the page owns ONE connection state and ONE sentence; the delete dialog, the members
 * section and the attach panel are handed that state (they show no sentence of their own).
 */
describe('GroupDetailView — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('shows one sentence for an admin and hands the same state to the three write surfaces, before and after going offline', () => {
    useGroup.mockReturnValue({ data: makeGroup({ adminIds: ['u1'] }), isLoading: false, isError: false, refetch: vi.fn() });
    const { container } = render(<GroupDetailView id="g1" />);
    expect(visibleNotices(container)).toHaveLength(0);

    setOnLine(false);
    expect(visibleNotices(container)).toHaveLength(1);
    expect(visibleNotices(container)[0]).toHaveTextContent(OFFLINE_SENTENCE);
    const lastProps = (spy: { mock: { calls: unknown[] } }) => (spy.mock.calls.at(-1) as unknown as [{ write: { canWrite: boolean; noticeId: string } }])[0];
    const states = [MembersSection, AttachRowsPanel, DeleteGroupDialog].map(lastProps);
    for (const props of states) expect(props.write).toMatchObject({ canWrite: false, noticeId: visibleNotices(container)[0]!.id });

    setOnLine(true);
    expect(visibleNotices(container)).toHaveLength(0);
    for (const spy of [MembersSection, AttachRowsPanel, DeleteGroupDialog]) {
      expect((spy.mock.calls.at(-1) as unknown as [{ write: { canWrite: boolean } }])[0].write.canWrite).toBe(true);
    }
  });

  it('a non-admin with nothing to attach sees no sentence: there is nothing here they could write', () => {
    $user.set({ ...USER, uid: 'u2' });
    useGroup.mockReturnValue({ data: makeGroup({ adminIds: ['u1'] }), isLoading: false, isError: false, refetch: vi.fn() });
    const { container } = render(<GroupDetailView id="g1" />);
    setOnLine(false);
    expect(visibleNotices(container)).toHaveLength(0);
  });
});
