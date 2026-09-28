// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, expect, it, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import type { AuthAdapter, AuthUser, ProfileStore } from '@cyber-eco/types';
import { AuthProvider, createJustSplitProfile, onProfileLoaded, type AuthProfile } from '@/lib/auth-context';
import { $authReady, $profile, $user } from '@/stores/auth';
import AuthBridge from './AuthBridge';

/** Minimal in-memory `AuthAdapter` test double — no real backend involved. */
class MemoryAuthAdapter implements AuthAdapter {
  private listeners: Array<(user: AuthUser | null) => void> = [];
  private user: AuthUser | null = null;

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.user);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /** Simulates a completed Google sign-in landing on this page. */
  signInWithGoogle(): void {
    this.user = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
    this.listeners.forEach((l) => l(this.user));
  }

  signIn = async (): Promise<AuthUser> => {
    throw new Error('unused in this test');
  };
  signUp = async (): Promise<AuthUser> => {
    throw new Error('unused in this test');
  };
  signOut = async (): Promise<void> => {};
  signInWithProvider = async (): Promise<AuthUser> => {
    throw new Error('unused in this test');
  };
  resetPassword = async (): Promise<void> => {};
  updatePassword = async (): Promise<void> => {};
  updateDisplayProfile = async (): Promise<void> => {};
  getCurrentUser = (): AuthUser | null => this.user;
  getIdToken = async (): Promise<string | null> => null;
}

/** Records every call so the test can assert "exactly one `set`". */
class MemoryProfileStore implements ProfileStore<AuthProfile> {
  calls: Array<{ method: 'get' | 'set' | 'update'; args: unknown[] }> = [];
  private rows = new Map<string, AuthProfile>();

  async get(uid: string): Promise<AuthProfile | null> {
    this.calls.push({ method: 'get', args: [uid] });
    return this.rows.get(uid) ?? null;
  }
  async set(uid: string, profile: AuthProfile): Promise<void> {
    this.calls.push({ method: 'set', args: [uid, profile] });
    this.rows.set(uid, profile);
  }
  async update(uid: string, partial: Partial<AuthProfile>): Promise<void> {
    this.calls.push({ method: 'update', args: [uid, partial] });
    const existing = this.rows.get(uid);
    this.rows.set(uid, { ...existing, ...partial } as AuthProfile);
  }
}

describe('AuthBridge (plan B4 test 1)', () => {
  beforeEach(() => {
    $user.set(null);
    $profile.set(null);
    $authReady.set(false);
  });

  it('mirrors useAuth() into $user/$profile/$authReady, flipping ready only once isLoading is false, and writes the profile exactly once', async () => {
    const adapter = new MemoryAuthAdapter();
    const profileStore = new MemoryProfileStore();

    render(
      <AuthProvider
        config={{ adapter, profileStore }}
        createUserProfile={createJustSplitProfile}
        onUserProfileLoaded={onProfileLoaded}
      >
        <AuthBridge />
      </AuthProvider>,
    );

    // No session yet: readiness flips once the adapter has reported "no user".
    await waitFor(() => expect($authReady.get()).toBe(true));
    expect($user.get()).toBeNull();
    expect($profile.get()).toBeNull();

    adapter.signInWithGoogle();

    await waitFor(() => expect($user.get()?.uid).toBe('u1'));
    await waitFor(() => expect($profile.get()).not.toBeNull());
    expect($authReady.get()).toBe(true);

    const setCalls = profileStore.calls.filter((c) => c.method === 'set');
    expect(setCalls).toHaveLength(1);
    const [, written] = setCalls[0]!.args as [string, AuthProfile];
    expect(written.apps).toEqual(['justsplit']);
    expect(written.preferences).toEqual({ preferredCurrency: 'USD' });
    expect($profile.get()).toEqual(written);
  });
});
