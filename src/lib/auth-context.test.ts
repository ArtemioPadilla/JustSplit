import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@cyber-eco/types';
import { createJustSplitProfile } from './auth-context';

const baseUser: AuthUser = {
  uid: 'u1',
  email: 'ana@example.com',
  displayName: 'Ana',
  photoURL: 'https://example.com/ana.jpg',
  emailVerified: true,
};

/**
 * `createJustSplitProfile` is the `createUserProfile` passed to
 * `<AuthProvider>` (plan B4): it runs once, on the FIRST authenticated
 * `onAuthStateChanged`, when `profileStore.get(uid)` finds nothing. It must
 * be a stable module-level reference (not an inline arrow) — the provider's
 * effect lists it in its dependency array, so a fresh function identity on
 * every render would re-subscribe the adapter listener.
 */
describe('createJustSplitProfile (plan B4)', () => {
  it('seeds apps and preferences.preferredCurrency for a brand-new profile', () => {
    const profile = createJustSplitProfile(baseUser);
    expect(profile.id).toBe('u1');
    expect(profile.name).toBe('Ana');
    expect(profile.email).toBe('ana@example.com');
    expect(profile.avatarUrl).toBe('https://example.com/ana.jpg');
    expect(profile.apps).toEqual(['justsplit']);
    expect(profile.permissions).toEqual([]);
    expect(profile.preferences).toEqual({ preferredCurrency: 'USD' });
  });

  it('stamps createdAt, updatedAt and lastLoginAt with the same ISO timestamp', () => {
    const profile = createJustSplitProfile(baseUser);
    expect(profile.createdAt).toBe(profile.updatedAt);
    expect(profile.createdAt).toBe(profile.lastLoginAt);
    expect(() => new Date(profile.createdAt as string).toISOString()).not.toThrow();
  });

  it('falls back to "User" when displayName is null', () => {
    const profile = createJustSplitProfile({ ...baseUser, displayName: null });
    expect(profile.name).toBe('User');
  });

  it('omits email/avatarUrl instead of storing null', () => {
    const profile = createJustSplitProfile({ ...baseUser, email: null, photoURL: null });
    expect(profile.email).toBeUndefined();
    expect(profile.avatarUrl).toBeUndefined();
  });
});
