// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { AuthAdapter } from '@cyber-eco/types';
// Static, top-level: `@cyber-eco/auth` (and therefore `react/jsx-runtime`,
// which itself reads `process.env.NODE_ENV` ONCE at module-evaluation time)
// must finish loading — and cache that dev/prod branch — while `process`
// still exists. A dynamic `import()` performed only inside the test, after
// deleting `globalThis.process`, would trigger that first-time module
// evaluation with `process` already gone and throw for an unrelated reason
// (react/jsx-runtime itself, not the code under test).
import { AuthProvider, createJustSplitProfile, onProfileLoaded } from './auth-context';

/**
 * Plan B4 test (6), the non-build half: `@cyber-eco/auth`'s client entry
 * reads `process.env` in a few utilities (`useHubAuth.ts`, `logger.ts`)
 * behind a `typeof process !== 'undefined'` guard, so it must survive a real
 * browser (no `process` global at all) even though `astro.config.mjs`'s
 * `define` block only statically replaces two specific keys
 * (`NODE_ENV`/`NEXT_PUBLIC_HUB_URL`) at build time — every other read needs
 * that runtime guard. jsdom normally leaves Node's `process` global in
 * place, unlike a real browser; deleting it here (after every module this
 * test needs has already loaded) reproduces that for one assertion, then
 * restores it so it doesn't leak into other test files.
 */
describe('@cyber-eco/auth survives a browser with no `process` global', () => {
  let savedProcess: typeof globalThis.process;

  beforeEach(() => {
    savedProcess = globalThis.process;
    // @ts-expect-error -- simulating a real browser, which has no `process` global at all.
    delete globalThis.process;
  });

  afterEach(() => {
    globalThis.process = savedProcess;
  });

  it('mounts <AuthProvider> without a ReferenceError', () => {
    const adapter: AuthAdapter = {
      onAuthStateChanged: (cb) => {
        cb(null);
        return () => {};
      },
      signIn: async () => {
        throw new Error('unused');
      },
      signUp: async () => {
        throw new Error('unused');
      },
      signOut: async () => {},
      signInWithProvider: async () => {
        throw new Error('unused');
      },
      resetPassword: async () => {},
      updatePassword: async () => {},
      updateDisplayProfile: async () => {},
      getCurrentUser: () => null,
      getIdToken: async () => null,
    };
    const profileStore = { get: async () => null, set: async () => {}, update: async () => {} };

    expect(() =>
      render(
        <AuthProvider
          config={{ adapter, profileStore }}
          createUserProfile={createJustSplitProfile}
          onUserProfileLoaded={onProfileLoaded}
        >
          <p>ready</p>
        </AuthProvider>,
      ),
    ).not.toThrow();
  });
});
