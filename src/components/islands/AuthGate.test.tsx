// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { $authReady, $profile, $user } from '@/stores/auth';
import AuthGate from './AuthGate';

/**
 * AuthGate (plan B4): readiness/navigation only. Every allow/deny decision
 * stays in RouteGuard (CLAUDE.md: route-guard.tsx is the only gating
 * module) — these tests exercise the wrapper, not the guard itself (that's
 * route-guard.test.tsx and stores/auth.test.ts's toGuardUser suite).
 */
describe('AuthGate (plan B4 tests 3-5)', () => {
  const replace = vi.fn();

  beforeEach(() => {
    $user.set(null);
    $profile.set(null);
    $authReady.set(false);
    replace.mockClear();
    // jsdom throws "not implemented" on real navigation; stub it out.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace },
    });
  });

  it('test 3: renders a Skeleton while not ready and does not redirect', () => {
    $authReady.set(false);
    render(
      <AuthGate>
        <p>secret</p>
      </AuthGate>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('test 4: redirects to /landing/ once ready with no user', () => {
    $authReady.set(true);
    $user.set(null);
    render(
      <AuthGate>
        <p>secret</p>
      </AuthGate>,
    );
    expect(replace).toHaveBeenCalledWith('/landing/');
  });

  it('test 5: denies (renders no children) for a signed-in user with an unknown role', () => {
    // toGuardUser only ever grants 'user' — allow={['admin']} must deny even
    // though $user is set (RouteGuard, not AuthGate, makes this call).
    $authReady.set(true);
    $user.set({ uid: 'u1', email: 'a@b.com', displayName: 'Ana', photoURL: null, emailVerified: true });
    render(
      <AuthGate allow={['admin']} fallback={<p>denied</p>}>
        <p>secret</p>
      </AuthGate>,
    );
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders children for a signed-in user with the default allow=["user"]', () => {
    $authReady.set(true);
    $user.set({ uid: 'u1', email: 'a@b.com', displayName: 'Ana', photoURL: null, emailVerified: true });
    render(
      <AuthGate>
        <p>secret</p>
      </AuthGate>,
    );
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
