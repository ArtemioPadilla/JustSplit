// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `ProfileIsland` (plan B15, risk:high) — `/profile`'s route island.
 * `ErrorBoundary > AuthIsland > AuthGate > Content`, the same composition as
 * `GroupFormIsland`/`ExpenseFormIsland`. Two suites:
 *   - wiring (AuthIsland/AuthGate mocked to a pass-through): sr-only `<h1>`,
 *     ProfileForm + AccountSettings mounted.
 *   - the real, unmocked composition: `src/lib/data/adapter.ts` exports
 *     null adapters in this test env (no PUBLIC_SUPABASE_* config, same as
 *     every CI build without Supabase env vars) — AuthIsland's own
 *     "not configured" Alert is the expected, tested outcome (plan B15
 *     decision 1: "In the unconfigured build it renders AuthIsland's 'not
 *     configured' state. That is fine.").
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { ProfileForm } = vi.hoisted(() => ({ ProfileForm: vi.fn(() => <div data-testid="profile-form" />) }));
vi.mock('@/components/features/profile/ProfileForm', () => ({ ProfileForm }));

const { AccountSettings } = vi.hoisted(() => ({ AccountSettings: vi.fn(() => <div data-testid="account-settings" />) }));
vi.mock('@/components/features/profile/AccountSettings', () => ({ AccountSettings }));

const { default: ProfileIsland } = await import('./ProfileIsland');

afterEach(() => {
  vi.clearAllMocks();
});

describe('ProfileIsland — wiring', () => {
  it('renders a sr-only h1 outside the auth-gated subtree', () => {
    render(<ProfileIsland />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/profile/i);
    expect(heading).toHaveClass('sr-only');
  });

  it('mounts ProfileForm and AccountSettings', () => {
    render(<ProfileIsland />);
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    expect(screen.getByTestId('account-settings')).toBeInTheDocument();
  });
});

describe('ProfileIsland — real composition, unconfigured build', () => {
  it('renders AuthIsland\'s "not configured" alert instead of crashing', async () => {
    vi.resetModules();
    vi.doUnmock('./AuthIsland');
    vi.doUnmock('./AuthGate');
    vi.doUnmock('@/components/features/profile/ProfileForm');
    vi.doUnmock('@/components/features/profile/AccountSettings');
    const { default: RealProfileIsland } = await import('./ProfileIsland');
    render(<RealProfileIsland />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
  });
});
