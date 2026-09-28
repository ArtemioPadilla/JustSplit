// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JustSplitProfile } from '@/schemas/profile';

const signInWithOAuthRedirect = vi.fn();
vi.mock('@/lib/data/client', () => ({
  signInWithOAuthRedirect: (...args: unknown[]) => signInWithOAuthRedirect(...args),
}));

const authAdapter = {
  signIn: vi.fn().mockResolvedValue(undefined),
  signUp: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue(undefined),
  resetPassword: vi.fn().mockResolvedValue(undefined),
  updatePassword: vi.fn().mockResolvedValue(undefined),
  updateDisplayProfile: vi.fn().mockResolvedValue(undefined),
};
const profileStore = {
  get: vi.fn(),
  set: vi.fn(),
  update: vi.fn().mockResolvedValue(undefined),
};
vi.mock('@/lib/data/adapter', () => ({ authAdapter, profileStore }));

import {
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
