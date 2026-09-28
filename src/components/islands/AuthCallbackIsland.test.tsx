// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const { consumeGoogleNext } = vi.hoisted(() => ({ consumeGoogleNext: vi.fn() }));
vi.mock('@/stores/auth', () => ({ consumeGoogleNext }));

import AuthCallbackIsland from './AuthCallbackIsland';

/**
 * `/auth/callback.astro` (plan B4): renders this while the browser completes
 * the Google redirect round-trip, then reads back the `next` target stashed
 * before the redirect (never passed through the OAuth round-trip itself) and
 * navigates — through `safeNext` (inside `consumeGoogleNext`) and `withBase`.
 */
describe('AuthCallbackIsland', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, replace: vi.fn() },
    });
  });

  it('redirects to withBase(consumeGoogleNext()) on mount', () => {
    consumeGoogleNext.mockReturnValue('/expenses/list');
    render(<AuthCallbackIsland />);
    expect(window.location.replace).toHaveBeenCalledWith('/expenses/list');
  });

  it('falls back to / when there is no stashed next', () => {
    consumeGoogleNext.mockReturnValue('/');
    render(<AuthCallbackIsland />);
    expect(window.location.replace).toHaveBeenCalledWith('/');
  });
});
