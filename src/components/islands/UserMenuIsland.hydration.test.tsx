// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $authReady, $profile, $user } from '@/stores/session';
import UserMenuIsland from './UserMenuIsland';

/**
 * Hydration #418 (plan B6b). UserMenuIsland is SSR'd into every app page's
 * header (`client:idle`), and the site is static: the server can only ever
 * render the signed-out state. But `client:idle` hydrates whenever the
 * browser is idle, and the page's `client:only` route island (AuthBridge)
 * mirrors the session into `$user` / `$profile` / `$authReady` as soon as it
 * mounts, so on a real signed-in page load the stores can already hold the
 * session BEFORE the header hydrates. `useStore` uses the live store value as
 * its server snapshot too, so the header's hydration render was the signed-in
 * markup against the server's signed-out markup: React error #418, on the
 * signed-in loads that lose that race (intermittent).
 *
 * This reproduces the race deterministically: render the server string with
 * the stores as the server sees them (defaults), THEN put the stores in the
 * state a real page has when the header finally hydrates, THEN hydrate.
 */
// No Testing Library render here (hydrateRoot is the point), so opt in to act()
// ourselves; otherwise React logs an act-environment warning on every update.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ANA = { uid: 'u1', email: 'ana@example.test', displayName: 'Ana', photoURL: null, emailVerified: true };
const ANA_PROFILE = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@example.test',
  avatarUrl: null,
  apps: [],
  permissions: [],
  preferences: { preferredCurrency: 'USD' },
};

function resetStores() {
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);
}

async function hydrateAgainst(html: string) {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.appendChild(container);
  const recoverable: unknown[] = [];
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, <UserMenuIsland />, {
      onRecoverableError: (e) => recoverable.push(e),
    });
  });
  return {
    container,
    recoverable,
    consoleErrors: consoleError.mock.calls,
    unmount: () => act(() => root?.unmount()),
  };
}

describe('UserMenuIsland hydration (plan B6b, #418)', () => {
  beforeEach(resetStores);
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    resetStores();
  });

  it('hydrates without a mismatch when the session is already in the stores by the time the header hydrates', async () => {
    const serverHtml = renderToString(<UserMenuIsland />);
    expect(serverHtml).toContain('Sign in');

    // The route island's AuthBridge ran first (client:only mounts before
    // client:idle fires): a signed-in page load.
    $user.set(ANA);
    $profile.set(ANA_PROFILE);
    $authReady.set(true);

    const { recoverable, consoleErrors, unmount } = await hydrateAgainst(serverHtml);
    expect(recoverable).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await unmount();
  });

  it('still shows the signed-in header once hydration is done (the session is not lost, only deferred a render)', async () => {
    const serverHtml = renderToString(<UserMenuIsland />);
    $user.set(ANA);
    $profile.set(ANA_PROFILE);
    $authReady.set(true);

    const { container, unmount } = await hydrateAgainst(serverHtml);
    expect(container.textContent).not.toContain('Sign in');
    expect(container.textContent).toContain('Ana');
    await unmount();
  });

  it('hydrates cleanly with the default (signed-out) stores, and follows a later sign-in', async () => {
    const serverHtml = renderToString(<UserMenuIsland />);
    const { container, recoverable, consoleErrors, unmount } = await hydrateAgainst(serverHtml);
    expect(recoverable).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(container.textContent).toContain('Sign in');

    await act(async () => {
      $user.set(ANA);
      $authReady.set(true);
    });
    expect(container.textContent).not.toContain('Sign in');
    await unmount();
  });
});
