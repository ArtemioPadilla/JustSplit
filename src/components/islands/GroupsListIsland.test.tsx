// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `GroupsListIsland` (plan B12) — the `/groups/list` route island: every
 * group the caller is a member of (`useGroups`), each row showing member
 * count and a link to `/groups/<id>`, plus a "New group" link. Same
 * `ErrorBoundary > AuthIsland > AuthGate > Content` composition as
 * `ExpenseListIsland`/`FriendsIsland` — `AuthIsland`/`AuthGate` are mocked
 * as pass-throughs here (same choice `ExpenseFormIsland.test.tsx` makes):
 * their own redirect/skeleton behavior is proven by their own suites and
 * by `ExpenseListIsland.test.tsx`'s full auth-flow coverage; this file only
 * proves THIS island's content wiring against `useGroups`.
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useGroups } = vi.hoisted(() => ({ useGroups: vi.fn() }));
vi.mock('@/lib/data/hooks/useGroups', () => ({ useGroups }));

const { default: GroupsListIsland } = await import('./GroupsListIsland');

afterEach(() => {
  vi.clearAllMocks();
});

describe('GroupsListIsland', () => {
  it('has a "New group" link to /groups/new, present in every content state', () => {
    useGroups.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
    render(<GroupsListIsland />);
    expect(screen.getByRole('link', { name: /new group/i })).toHaveAttribute('href', '/groups/new');
  });

  it('shows an error state with a bounded retry on failure', () => {
    const refetch = vi.fn();
    useGroups.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    render(<GroupsListIsland />);
    const retry = screen.getByRole('button', { name: /retry/i });
    retry.click();
    expect(refetch).toHaveBeenCalled();
  });

  it('shows an empty state with no groups', () => {
    useGroups.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    render(<GroupsListIsland />);
    expect(screen.getByText(/no groups yet/i)).toBeInTheDocument();
  });

  it('lists every group with its member count and a link to its detail page', () => {
    useGroups.mockReturnValue({
      data: [
        { id: 'g1', name: 'Roommates', memberIds: ['u1', 'u2'] },
        { id: 'g2', name: 'Trip crew', memberIds: ['u1', 'u2', 'u3'] },
      ],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<GroupsListIsland />);

    const roommates = screen.getByRole('link', { name: /roommates/i });
    expect(roommates).toHaveAttribute('href', '/groups/g1');
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();

    const trip = screen.getByRole('link', { name: /trip crew/i });
    expect(trip).toHaveAttribute('href', '/groups/g2');
    expect(screen.getByText(/3 members/i)).toBeInTheDocument();
  });
});
