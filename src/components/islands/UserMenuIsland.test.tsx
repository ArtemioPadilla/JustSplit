// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/stores/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/auth')>();
  return { ...actual, signOut };
});

import { $authReady, $profile, $user } from '@/stores/auth';
import UserMenuIsland from './UserMenuIsland';

/**
 * UserMenuIsland (plan B6, spec D3): a layout island mounted from
 * SiteHeader.astro on every page. It must read `$user`/`$profile`/
 * `$authReady` only (never mount `AuthIsland`/`QueryProvider` — see
 * src/tests/query-provider-boundary.test.ts) and must never crash when
 * Supabase isn't configured for the build — which is exactly the default,
 * signed-out state these stores start in (ci.yml builds with no Supabase
 * config; CLAUDE.md rule 7 / spec D3).
 */
describe('UserMenuIsland', () => {
  beforeEach(() => {
    $user.set(null);
    $profile.set(null);
    $authReady.set(false);
    signOut.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a sign-in link and no crash before auth readiness resolves (Supabase-disabled builds included)', () => {
    render(<UserMenuIsland />);
    const link = screen.getByRole('link', { name: /sign in/i });
    expect(link).toHaveAttribute('href', '/auth/signin/');
  });

  it('still renders the signed-out link once ready with no user', () => {
    $authReady.set(true);
    $user.set(null);
    render(<UserMenuIsland />);
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it(
    'renders the profile name/avatar and a sign-out control for a signed-in user',
    async () => {
      $authReady.set(true);
      $user.set({ uid: 'u1', email: 'ana@example.test', displayName: 'Ana', photoURL: null, emailVerified: true });
      $profile.set({
        id: 'u1',
        name: 'Ana',
        email: 'ana@example.test',
        avatarUrl: null,
        apps: [],
        permissions: [],
        preferences: { preferredCurrency: 'USD' },
      });
      render(<UserMenuIsland />);
      expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
      // The name is real, accessible content in the Suspense fallback itself
      // (not aria-hidden) — only the avatar image and the dropdown behavior
      // are deferred to the lazy chunk.
      expect(screen.getByText('Ana')).toBeInTheDocument();
      // The dropdown trigger button comes from the lazy-loaded chunk
      // (React.lazy + Suspense — plan B7/B19 "Header weight") and isn't
      // present on the very first render.
      expect(screen.queryByRole('button', { name: /ana/i })).not.toBeInTheDocument();
      // Generous timeout (matches src/components/ui/field-type/form-item.behavior.test.tsx's
      // lazy DatePicker test): this is the first time this file resolves the
      // UserAccountMenu chunk, which is measurably slower than an already-warm
      // module cache under a full, parallel test-suite run.
      expect(await screen.findByRole('button', { name: /ana/i }, { timeout: 15000 })).toBeInTheDocument();
    },
    20000,
  );

  it(
    'calls signOut() from src/stores/auth.ts when the sign-out control is used',
    async () => {
      const user = userEvent.setup();
      $authReady.set(true);
      $user.set({ uid: 'u1', email: 'ana@example.test', displayName: 'Ana', photoURL: null, emailVerified: true });
      $profile.set(null);
      render(<UserMenuIsland />);

      await user.click(await screen.findByRole('button', { name: /ana/i }, { timeout: 15000 }));
      await user.click(await screen.findByRole('menuitem', { name: /sign out/i }));

      expect(signOut).toHaveBeenCalledTimes(1);
    },
    20000,
  );
});
