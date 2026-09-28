// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const { completeOAuthSignIn } = vi.hoisted(() => ({ completeOAuthSignIn: vi.fn() }));
vi.mock('@/stores/auth', () => ({ completeOAuthSignIn }));

import AuthCallbackIsland from './AuthCallbackIsland';

/**
 * `/auth/callback.astro` (plan B4): waits for supabase-js to finish the PKCE
 * exchange, then navigates to the stashed `next` (validated by `safeNext`
 * inside `completeOAuthSignIn`) through `withBase`. Navigating before the
 * exchange settles would abort it and lose the sign-in.
 */
describe('AuthCallbackIsland', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: vi.fn() },
    });
  });

  it('does not navigate until the sign-in has completed', async () => {
    let finish!: (target: string) => void;
    completeOAuthSignIn.mockReturnValue(new Promise<string>((r) => (finish = r)));
    render(<AuthCallbackIsland />);
    await Promise.resolve();
    expect(window.location.replace).not.toHaveBeenCalled();
    finish('/expenses/list');
    await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/expenses/list'));
  });

  it('navigates to the target completeOAuthSignIn returns (the sign-in page on failure)', async () => {
    completeOAuthSignIn.mockResolvedValue('/auth/signin/');
    render(<AuthCallbackIsland />);
    await waitFor(() => expect(window.location.replace).toHaveBeenCalledWith('/auth/signin/'));
  });
});
