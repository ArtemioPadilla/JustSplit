// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Event } from '@/schemas/event';
import type { ExpenseGroup } from '@/schemas/group';
import { $authReady, $profile, $user } from '@/stores/session';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine } from '@/tests/offline-helpers';

/**
 * `EventForm` (plan B11b): `/events/new` and `/events/edit/<id>` share it.
 * The payloads themselves (created_by, kind, creator first, the minimal edit
 * patch) are `domain/events.test.ts`'s job; this file proves the WIRING and
 * the rules the database enforces, mirrored so a doomed save is refused early:
 *
 *  - Participants are REGISTERED USERS ONLY, never free text: on create, the
 *    caller's accepted friends (or, with `?group=`, that group's members — the
 *    RLS insert check needs `member_ids ⊆ group`), and the caller is always
 *    included and cannot be unticked.
 *  - On edit (ADR 0013) only ADDED members are checked, as friends (or as group
 *    members for a group event): an existing non-friend member is listed, never
 *    blocks a save and can be removed; removing anyone locks nothing.
 *  - Notify-then-navigate goes through `notifications.ts` with
 *    `{ afterNavigation: true }` (a full page load discards a live toast).
 */
function stubLocationAssign() {
  const real = window.location;
  const assign = vi.fn();
  // Live getters over the real location (not a frozen spread copy): `?group=` is read
  // from `location.search` at mount, so `history.replaceState` in each test must stay visible.
  const stub = {
    assign,
    get search() {
      return real.search;
    },
    get pathname() {
      return real.pathname;
    },
    get href() {
      return real.href;
    },
    get hash() {
      return real.hash;
    },
  };
  Object.defineProperty(window, 'location', { configurable: true, value: stub });
  return {
    assign,
    restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }),
  };
}

const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { useFriends, useProfiles, useGroup, useCreateEvent, useUpdateEvent } = vi.hoisted(() => ({
  useFriends: vi.fn(),
  useProfiles: vi.fn(),
  useGroup: vi.fn(),
  useCreateEvent: vi.fn(),
  useUpdateEvent: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useGroup', () => ({ useGroup }));
vi.mock('@/lib/data/hooks/useCreateEvent', () => ({ useCreateEvent }));
vi.mock('@/lib/data/hooks/useUpdateEvent', () => ({ useUpdateEvent }));

const { EventForm } = await import('./EventForm');
const { EventNotFoundError } = await import('@/lib/data/repos/events');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NAMES: Record<string, string> = { u1: 'Ana', u2: 'Beto', u3: 'Caro', u4: 'Dani', stranger: 'Sam Stranger' };
const NOW = '2026-09-28T00:00:00.000Z';

function friendship(id: string, other: string, status: 'accepted' | 'pending') {
  return { id, users: ['u1', other], status, requestedBy: 'u1', createdAt: NOW };
}

function makeGroup(overrides: Partial<ExpenseGroup> = {}): ExpenseGroup {
  return {
    id: 'g1',
    name: 'Roommates',
    type: 'friends',
    currency: 'EUR',
    members: [],
    totalExpenses: 0,
    memberIds: ['u1', 'u3', 'u4'],
    adminIds: ['u1'],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    name: 'Cancún',
    description: 'Beach week',
    date: '2026-06-01',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    preferredCurrency: 'MXN',
    memberIds: ['u1', 'u2'],
    kind: 'event',
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

function profilesFor(ids: string[]) {
  return { data: ids.map((id) => ({ id, name: NAMES[id] ?? id, avatarUrl: null })), isError: false, isPending: false };
}

let createMutateAsync: ReturnType<typeof vi.fn>;
let updateMutateAsync: ReturnType<typeof vi.fn>;
let location: ReturnType<typeof stubLocationAssign>;

beforeEach(() => {
  $user.set(USER);
  $profile.set({ id: 'u1', name: 'Ana', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } });
  $authReady.set(true);
  $preferredCurrency.set('USD');
  location = stubLocationAssign();
  window.history.replaceState(null, '', '/events/new');

  useFriends.mockReturnValue({
    data: [friendship('f1', 'u2', 'accepted'), friendship('f2', 'u3', 'pending'), friendship('f3', 'u4', 'accepted')],
    isError: false,
    isRetrying: false,
    refetch: vi.fn(),
  });
  useProfiles.mockImplementation((ids: string[]) => profilesFor(ids));
  useGroup.mockReturnValue({ data: undefined, isLoading: false, isSuccess: false, isError: false, refetch: vi.fn() });

  createMutateAsync = vi.fn().mockResolvedValue({ id: 'ev1' });
  updateMutateAsync = vi.fn().mockResolvedValue({ id: 'e1' });
  useCreateEvent.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false });
  useUpdateEvent.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
});

afterEach(() => {
  location.restore();
  window.history.replaceState(null, '', '/');
  vi.clearAllMocks();
});

async function fillName(value: string) {
  await userEvent.clear(screen.getByLabelText(/event name/i));
  await userEvent.type(screen.getByLabelText(/event name/i), value);
}

describe('EventForm — create: who can be picked (registered users only)', () => {
  it('lists the caller as an always-included, locked "you" row plus ONLY accepted friends (never a pending request)', () => {
    render(<EventForm mode="create" />);
    const me = screen.getByRole('checkbox', { name: /ana \(you\)/i });
    expect(me).toBeChecked();
    expect(me).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('checkbox', { name: 'Beto' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dani' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Caro' })).not.toBeInTheDocument();
  });

  it('has no free-text participant input — nobody unregistered can be invented', () => {
    render(<EventForm mode="create" />);
    expect(screen.queryByPlaceholderText(/participant name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^add$/i })).not.toBeInTheDocument();
  });

  it('with ?group=, offers that group\'s members instead of friends (RLS: member_ids must be a subset of the group)', () => {
    window.history.replaceState(null, '', '/events/new?group=g1');
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    render(<EventForm mode="create" />);
    expect(screen.getByRole('checkbox', { name: 'Caro' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Dani' })).toBeInTheDocument();
    // Beto is a friend but not in the group: not offered.
    expect(screen.queryByRole('checkbox', { name: 'Beto' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /ana \(you\)/i })).toBeChecked();
  });

  it('with ?group=, says which group the event belongs to and seeds the currency from it', () => {
    window.history.replaceState(null, '', '/events/new?group=g1');
    useGroup.mockReturnValue({ data: makeGroup({ currency: 'EUR' }), isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    render(<EventForm mode="create" />);
    expect(screen.getByText('Roommates', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^currency/i)).toHaveValue('EUR');
  });

  it('with a ?group= that resolves to nothing, says so and falls back to friends (and writes no group)', async () => {
    window.history.replaceState(null, '', '/events/new?group=ghost');
    useGroup.mockReturnValue({ data: null, isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    render(<EventForm mode="create" />);
    expect(screen.getByRole('status')).toHaveTextContent(/couldn.t find that group/i);
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeInTheDocument();

    await fillName('Trip');
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync.mock.calls[0][0].groupId).toBeNull();
  });

  it('shows a skeleton while ?group= is still loading (never a half-resolved pool)', () => {
    window.history.replaceState(null, '', '/events/new?group=g1');
    useGroup.mockReturnValue({ data: undefined, isLoading: true, isSuccess: false, isError: false, refetch: vi.fn() });
    const { container } = render(<EventForm mode="create" />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('with no friends yet, still lets you create the event and points to /friends', () => {
    useFriends.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    render(<EventForm mode="create" />);
    expect(screen.getByText(/no friends to add yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add a friend/i })).toHaveAttribute('href', '/friends');
    expect(screen.getByRole('button', { name: /create event/i })).toBeEnabled();
  });
});

describe('EventForm — create: loading and errors', () => {
  it('shows a busy skeleton while the friends list loads', () => {
    useFriends.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
    const { container } = render(<EventForm mode="create" />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByLabelText(/event name/i)).not.toBeInTheDocument();
  });

  it('shows an error state with a retry when friends fail to load', async () => {
    const refetch = vi.fn();
    useFriends.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    render(<EventForm mode="create" />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an error state with a retry when the ?group= lookup itself fails', async () => {
    window.history.replaceState(null, '', '/events/new?group=g1');
    const refetch = vi.fn();
    useGroup.mockReturnValue({ data: undefined, isLoading: false, isSuccess: false, isError: true, refetch });
    render(<EventForm mode="create" />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('EventForm — create: validation and submit', () => {
  it('blocks submit with inline errors on an empty name, without calling the mutation', async () => {
    render(<EventForm mode="create" />);
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));
    expect(await screen.findByText('Event name is required.')).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('blocks an end date before the start date, on the end field', async () => {
    render(<EventForm mode="create" />);
    await fillName('Trip');
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-06-10' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-06-01' } });
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));
    expect(await screen.findByText(/end date can.t be before the start date/i)).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('defaults the start date to today, the currency to the preferred one, and marks the end date optional', () => {
    render(<EventForm mode="create" />);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(screen.getByLabelText(/start date/i)).toHaveValue(expected);
    expect(screen.getByLabelText(/end date \(optional\)/i)).toHaveValue('');
    expect(screen.getByLabelText(/^currency/i)).toHaveValue('USD');
  });

  it('sends created_by = the caller, kind "event", the creator first and the ticked friend, then navigates to the new event', async () => {
    render(<EventForm mode="create" />);
    await fillName('  Cancún  ');
    await userEvent.type(screen.getByLabelText(/description/i), 'Beach week');
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-06-01' } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '2026-06-08' } });
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beto' }));
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    expect(createMutateAsync.mock.calls[0][0]).toEqual({
      name: 'Cancún',
      description: 'Beach week',
      date: '2026-06-01',
      startDate: '2026-06-01',
      endDate: '2026-06-08',
      preferredCurrency: 'USD',
      kind: 'event',
      groupId: null,
      memberIds: ['u1', 'u2'],
      createdBy: 'u1',
    });
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/events/ev1'));
    expect(notifySuccess).toHaveBeenCalledWith('Event created', expect.objectContaining({ afterNavigation: true }));
  });

  it('a group event carries groupId and only group members', async () => {
    window.history.replaceState(null, '', '/events/new?group=g1');
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    render(<EventForm mode="create" />);
    await fillName('Flat dinner');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Caro' }));
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    const input = createMutateAsync.mock.calls[0][0];
    expect(input.groupId).toBe('g1');
    expect(input.memberIds).toEqual(['u1', 'u3']);
  });

  it('shows a generic error toast on failure, keeps the form and does not navigate', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('nope'));
    render(<EventForm mode="create" />);
    await fillName('Trip');
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Trip');
    expect(screen.getByRole('button', { name: /create event/i })).toBeEnabled();
  });

  it('disables the submit button and marks it busy while saving', () => {
    useCreateEvent.mockReturnValue({ mutateAsync: createMutateAsync, isPending: true });
    render(<EventForm mode="create" />);
    const button = screen.getByRole('button', { name: /creating|create event/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});

describe('EventForm — edit', () => {
  it('prefills every field from the event and lists current members checked', () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Cancún');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Beach week');
    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-06-01');
    expect(screen.getByLabelText(/end date/i)).toHaveValue('2026-06-08');
    expect(screen.getByLabelText(/^currency/i)).toHaveValue('MXN');
    expect(screen.getByRole('checkbox', { name: /ana \(you\)/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Dani' })).not.toBeChecked();
  });

  it('keeps an existing member who is not a friend visible and editable — they never block a save', async () => {
    render(<EventForm mode="edit" event={makeEvent({ memberIds: ['u1', 'stranger'] })} />);
    expect(screen.getByRole('checkbox', { name: 'Sam Stranger' })).toBeChecked();

    await fillName('Cancún 2026');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalled());
    expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { name: 'Cancún 2026' } });
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('offers only friends as additions: a non-friend who is not already a member is not listed', () => {
    render(<EventForm mode="edit" event={makeEvent({ memberIds: ['u1'] })} />);
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Sam Stranger' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Caro' })).not.toBeInTheDocument();
  });

  it('removing a member is always allowed and patches memberIds only', async () => {
    render(<EventForm mode="edit" event={makeEvent({ memberIds: ['u1', 'stranger'] })} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Sam Stranger' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { memberIds: ['u1'] } }));
  });

  it('adding a friend patches memberIds with the existing members first', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Dani' }));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { memberIds: ['u1', 'u2', 'u4'] } }));
  });

  it('the editor cannot untick themselves (RLS requires the actor to remain a member)', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    const me = screen.getByRole('checkbox', { name: /ana \(you\)/i });
    expect(me).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(me);
    expect(me).toBeChecked();
  });

  it('clearing the end date and description sends null for each', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: '' } });
    await userEvent.clear(screen.getByLabelText(/description/i));
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { description: null, endDate: null } }));
  });

  it('saving with nothing changed sends no request and simply returns to the event', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/events/e1'));
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it('after a save, toasts (queued across the page load) and navigates back to the event', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    await fillName('Renamed');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/events/e1'));
    expect(notifySuccess).toHaveBeenCalledWith('Event updated', expect.objectContaining({ afterNavigation: true }));
  });

  it('says so when the event was deleted underneath the edit, instead of a generic failure', async () => {
    updateMutateAsync.mockRejectedValueOnce(new EventNotFoundError('e1'));
    render(<EventForm mode="edit" event={makeEvent()} />);
    await fillName('Renamed');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(expect.stringMatching(/no longer exists|can.t be edited/i)));
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('on a generic failure keeps the edits and does not navigate', async () => {
    updateMutateAsync.mockRejectedValueOnce(new Error('nope'));
    render(<EventForm mode="edit" event={makeEvent()} />);
    await fillName('Renamed');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Renamed');
  });

  it('a GROUP event offers the group\'s members as additions (not friends), waits for the group, and cannot add anyone if the group is not visible', () => {
    // Loading: a skeleton, never a half-resolved pool.
    useGroup.mockReturnValue({ data: undefined, isLoading: true, isSuccess: false, isError: false, refetch: vi.fn() });
    const { container, unmount } = render(<EventForm mode="edit" event={makeEvent({ groupId: 'g1', memberIds: ['u1'] })} />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    unmount();

    // Loaded: the group's members.
    useGroup.mockReturnValue({ data: makeGroup(), isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    const loaded = render(<EventForm mode="edit" event={makeEvent({ groupId: 'g1', memberIds: ['u1'] })} />);
    expect(screen.getByRole('checkbox', { name: 'Caro' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Beto' })).not.toBeInTheDocument();
    loaded.unmount();

    // Not visible to this member any more: only who is already on the event.
    useGroup.mockReturnValue({ data: null, isLoading: false, isSuccess: true, isError: false, refetch: vi.fn() });
    render(<EventForm mode="edit" event={makeEvent({ groupId: 'g1', memberIds: ['u1', 'u2'] })} />);
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();
    expect(screen.queryByRole('checkbox', { name: 'Caro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Dani' })).not.toBeInTheDocument();
  });

  it('warns that removing someone stops them seeing expenses that do not name them', () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    expect(screen.getByText(/stop seeing/i)).toBeInTheDocument();
  });
});

describe('EventForm — accessibility', () => {
  it('gives every control an accessible name and the participants a group label', () => {
    render(<EventForm mode="create" />);
    expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^currency/i)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /participants/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cancel/i })).toHaveAttribute('href', '/events/list');
  });

  it('the edit form\'s Cancel goes back to the event, not the list', () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    expect(screen.getByRole('link', { name: /cancel/i })).toHaveAttribute('href', '/events/e1');
  });
});

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx`; same contract for events. */
describe('EventForm — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('create: the button is blocked and explained, keeps the typed name, and works again on reconnect', async () => {
    render(<EventForm mode="create" />);
    await fillName('Trip');

    setOnLine(false);
    const create = screen.getByRole('button', { name: /create event/i });
    expectBlocked(create);
    expect(screen.getByText(OFFLINE_SENTENCE)).toBeVisible();

    await userEvent.click(create);
    await userEvent.type(screen.getByLabelText(/event name/i), '{Enter}');
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Trip');
    expect(location.assign).not.toHaveBeenCalled();

    setOnLine(true);
    expectWritable(create);
    expect(screen.queryByText(OFFLINE_SENTENCE)).not.toBeInTheDocument();
    await userEvent.click(create);
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('create: a connection that drops mid-submit shows the plain failure, never success', async () => {
    createMutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    render(<EventForm mode="create" />);
    await fillName('Trip');
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not create this event. Please try again.'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Trip');
  });

  it('create: the repo refusing an offline write reads as the shared sentence', async () => {
    createMutateAsync.mockRejectedValueOnce(new OfflineWriteError());
    render(<EventForm mode="create" />);
    await fillName('Trip');
    await userEvent.click(screen.getByRole('button', { name: /create event/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });

  it('edit: Save changes is blocked and explained, then enabled on reconnect', async () => {
    render(<EventForm mode="edit" event={makeEvent()} />);
    await fillName('Renamed');

    setOnLine(false);
    const save = screen.getByRole('button', { name: /save changes/i });
    expectBlocked(save);
    await userEvent.click(save);
    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/event name/i)).toHaveValue('Renamed');

    setOnLine(true);
    expectWritable(save);
    await userEvent.click(save);
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1));
  });
});
