// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JustSplitProfile } from '@/schemas/profile';

// `vi.mock` factories are hoisted above imports/top-level statements, so the
// mocked values must be created through `vi.hoisted` to avoid a TDZ error.
const { signInWithOAuthRedirect, waitForSession, authAdapter, profileStore, clearPersistedQueryCache } = vi.hoisted(() => ({
  signInWithOAuthRedirect: vi.fn(),
  waitForSession: vi.fn(),
  authAdapter: {
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    updateDisplayProfile: vi.fn().mockResolvedValue(undefined),
  },
  profileStore: {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
  },
  clearPersistedQueryCache: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/data/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/client')>()),
  signInWithOAuthRedirect,
  waitForSession,
}));
vi.mock('@/lib/data/adapter', () => ({ authAdapter, profileStore }));
vi.mock('@/lib/queryClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/queryClient')>()),
  clearPersistedQueryCache,
}));

import {
  completeOAuthSignIn,
  $profile,
  $user,
  resetPassword,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  toGuardUser,
  updateDisplayProfile,
  updatePassword,
} from './auth';

const user = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };

describe('stores/auth actions (plan B4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    $user.set(null);
    $profile.set(null);
    // jsdom's default origin.
    window.history.replaceState(null, '', 'http://localhost:3000/auth/signin');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signIn delegates to authAdapter.signIn', async () => {
    await signIn('ana@example.com', 'hunter22');
    expect(authAdapter.signIn).toHaveBeenCalledWith('ana@example.com', 'hunter22');
  });

  it('signUp delegates to authAdapter.signUp', async () => {
    await signUp('ana@example.com', 'hunter22', 'Ana');
    expect(authAdapter.signUp).toHaveBeenCalledWith('ana@example.com', 'hunter22', 'Ana');
  });

  it('signOut delegates to authAdapter.signOut', async () => {
    await signOut();
    expect(authAdapter.signOut).toHaveBeenCalled();
  });

  it('signOut clears the persisted Query cache (ADR 0004: it is a copy of the signed-out user\'s data)', async () => {
    await signOut();
    expect(clearPersistedQueryCache).toHaveBeenCalled();
  });

  it('resetPassword forwards a redirectTo built from withBase on the current origin', async () => {
    await resetPassword('ana@example.com');
    expect(authAdapter.resetPassword).toHaveBeenCalledWith('ana@example.com', {
      redirectTo: 'http://localhost:3000/auth/reset-password/',
    });
  });

  it('updatePassword delegates to authAdapter.updatePassword', async () => {
    await updatePassword('newpassword1');
    expect(authAdapter.updatePassword).toHaveBeenCalledWith('newpassword1');
  });

  it('updateDisplayProfile delegates to authAdapter.updateDisplayProfile', async () => {
    await updateDisplayProfile({ displayName: 'Ana B' });
    expect(authAdapter.updateDisplayProfile).toHaveBeenCalledWith({ displayName: 'Ana B' });
  });

  describe('signInWithGoogle (plan B4 test 8)', () => {
    it('passes redirectTo = withBase("/auth/callback/") on the current origin', async () => {
      signInWithOAuthRedirect.mockResolvedValue({ error: null });
      await signInWithGoogle();
      expect(signInWithOAuthRedirect).toHaveBeenCalledWith('google', 'http://localhost:3000/auth/callback/');
    });

    it('stashes `next` in sessionStorage rather than passing it through the provider round-trip', async () => {
      signInWithOAuthRedirect.mockResolvedValue({ error: null });
      await signInWithGoogle('/expenses/list');
      expect(sessionStorage.getItem('justsplit:auth:next')).toBe('/expenses/list');
      // Never forwarded as part of the redirect URL:
      const [, redirectTo] = signInWithOAuthRedirect.mock.calls[0] as [string, string];
      expect(redirectTo).not.toContain('expenses');
    });

    it('throws the adapter error instead of swallowing it', async () => {
      signInWithOAuthRedirect.mockResolvedValue({ error: new Error('oauth down') });
      await expect(signInWithGoogle()).rejects.toThrow('oauth down');
    });
  });

  describe('toGuardUser (plan B4)', () => {
    const baseProfile: JustSplitProfile = {
      id: 'u1',
      apps: ['justsplit'],
      permissions: [],
      preferences: { preferredCurrency: 'USD' },
    };

    it('denies (null) when there is no signed-in user', () => {
      expect(toGuardUser(null, null)).toBeNull();
    });

    it('grants roles:["user"] from the session alone, even with no profile row', () => {
      expect(toGuardUser(user, null)).toEqual({ id: 'u1', roles: ['user'], flags: {} });
    });

    it('grants nothing extra when the profile row claims isAdmin:true — roles never come from profiles', () => {
      const guard = toGuardUser(user, { ...baseProfile, isAdmin: true });
      expect(guard).toEqual({ id: 'u1', roles: ['user'], flags: {} });
    });

    it('grants nothing extra when the profile row claims permissions:["admin"]', () => {
      const guard = toGuardUser(user, { ...baseProfile, permissions: ['admin'] });
      expect(guard).toEqual({ id: 'u1', roles: ['user'], flags: {} });
    });
  });
});

describe('completeOAuthSignIn (plan B4 callback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('waits for the session, then returns the stashed next through safeNext', async () => {
    sessionStorage.setItem('justsplit:auth:next', '/expenses/abc');
    waitForSession.mockResolvedValue({ signedIn: true, error: null });
    await expect(completeOAuthSignIn()).resolves.toBe('/expenses/abc');
    expect(waitForSession).toHaveBeenCalledTimes(1);
  });

  it('an unsafe stashed next still yields /', async () => {
    sessionStorage.setItem('justsplit:auth:next', '//evil.example');
    waitForSession.mockResolvedValue({ signedIn: true, error: null });
    await expect(completeOAuthSignIn()).resolves.toBe('/');
  });

  it('a failed exchange returns the sign-in page and clears the stash', async () => {
    sessionStorage.setItem('justsplit:auth:next', '/expenses/abc');
    waitForSession.mockResolvedValue({ signedIn: false, error: new Error('invalid flow state') });
    await expect(completeOAuthSignIn()).resolves.toBe('/auth/signin/');
    expect(sessionStorage.getItem('justsplit:auth:next')).toBeNull();
  });
});
