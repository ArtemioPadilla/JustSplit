// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('AuthIsland — unconfigured build (plan B4, CLAUDE.md rule 7 "guarded")', () => {
  it('renders an Alert instead of crashing when authAdapter/profileStore are null', async () => {
    // The real src/lib/data/adapter.ts exports null adapters in this test
    // env (no PUBLIC_SUPABASE_* config) — no mocking needed for this case.
    const { default: AuthIsland } = await import('./AuthIsland');
    render(
      <AuthIsland>
        <p>secret</p>
      </AuthIsland>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
  });
});

describe('AuthIsland — configured build', () => {
  it('renders AuthBridge + children inside AuthProvider when the adapters are available', async () => {
    vi.resetModules();
    vi.doMock('@/lib/data/adapter', () => ({
      authAdapter: {
        onAuthStateChanged: (cb: (user: unknown) => void) => {
          cb(null);
          return () => {};
        },
        setPersistence: async () => {},
      },
      profileStore: { get: async () => null, set: async () => {}, update: async () => {} },
    }));
    const { default: AuthIsland } = await import('./AuthIsland');
    render(
      <AuthIsland>
        <p>secret</p>
      </AuthIsland>,
    );
    expect(await screen.findByText('secret')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    vi.doUnmock('@/lib/data/adapter');
  });
});
