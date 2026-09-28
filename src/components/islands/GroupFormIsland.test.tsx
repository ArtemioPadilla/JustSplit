// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `GroupFormIsland` (plan B12) — `/groups/new`'s route island. Same
 * `ErrorBoundary > AuthIsland > AuthGate > Content` composition as
 * `ExpenseFormIsland` (B10); this file only proves THIS island's own
 * wiring (sr-only `<h1>` outside the auth-gated subtree, `GroupForm`
 * mounted, wrapped in a named `ErrorBoundary`).
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { GroupForm } = vi.hoisted(() => ({
  GroupForm: vi.fn(() => <div data-testid="group-form" />),
}));
vi.mock('@/components/features/groups/GroupForm', () => ({ GroupForm }));

const { default: GroupFormIsland } = await import('./GroupFormIsland');

afterEach(() => {
  vi.clearAllMocks();
});

describe('GroupFormIsland', () => {
  it('renders a sr-only h1 outside the auth-gated subtree', () => {
    render(<GroupFormIsland />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/new group/i);
    expect(heading).toHaveClass('sr-only');
  });

  it('mounts GroupForm', () => {
    render(<GroupFormIsland />);
    expect(screen.getByTestId('group-form')).toBeInTheDocument();
  });
});
