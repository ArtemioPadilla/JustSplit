import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  LookupRateLimitedError,
  SupabaseDisabledError,
  onPasswordRecovery,
  requireSupabase,
  rpc,
  signInWithOAuthRedirect,
  supabase,
  supabaseEnabled,
} from './client';

function fakeClient(result: { data: unknown; error: unknown }) {
  const call = vi.fn().mockResolvedValue(result);
  return { client: { rpc: call } as unknown as SupabaseClient, call };
}

function fakeAuthClient(result: { data: unknown; error: unknown }) {
  const signInWithOAuth = vi.fn().mockResolvedValue(result);
  return { client: { auth: { signInWithOAuth } } as unknown as SupabaseClient, signInWithOAuth };
}

function fakeAuthStateClient() {
  let handler: ((event: string) => void) | null = null;
  const unsubscribe = vi.fn();
  const client = {
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string) => void) => {
        handler = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  } as unknown as SupabaseClient;
  return { client, unsubscribe, emit: (event: string) => handler?.(event) };
}

describe('guarded Supabase client (plan B2a)', () => {
  it('is disabled in a build without the public config', () => {
    expect(supabaseEnabled).toBe(false);
    expect(supabase).toBeNull();
    expect(() => requireSupabase()).toThrow(SupabaseDisabledError);
  });
});

describe('rpc()', () => {
  it('throws SupabaseDisabledError without a client', async () => {
    await expect(rpc('find_profile_by_email', { p_email: 'a@b.c' }, null)).rejects.toBeInstanceOf(
      SupabaseDisabledError,
    );
  });

  it('forwards the function name and args and returns the rows', async () => {
    const rows = [{ id: 'u1', name: 'Ana', avatarUrl: null }];
    const { client, call } = fakeClient({ data: rows, error: null });
    await expect(rpc('find_profiles_by_ids', { ids: ['u1'] }, client)).resolves.toEqual(rows);
    expect(call).toHaveBeenCalledWith('find_profiles_by_ids', { ids: ['u1'] });
  });

  it('returns an empty list when PostgREST returns null data', async () => {
    const { client } = fakeClient({ data: null, error: null });
    await expect(rpc('find_profile_by_email', { p_email: 'a@b.c' }, client)).resolves.toEqual([]);
  });

  it('maps the find_profile_by_email rate limit (SQLSTATE P0429, message rate_limited) to a typed LookupRateLimitedError', async () => {
    const { client } = fakeClient({ data: null, error: { code: 'P0429', message: 'rate_limited' } });
    const failure = await rpc('find_profile_by_email', { p_email: 'a@b.c' }, client).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(LookupRateLimitedError);
    expect((failure as Error).name).toBe('LookupRateLimitedError');
    // No raw database text leaks through the typed error.
    expect((failure as Error).message).not.toMatch(/rate_limited|P0429/);
  });

  it('only that error is mapped: any other failure is still thrown as the PostgREST error', async () => {
    const other = { message: 'boom', code: 'XX000' };
    const { client } = fakeClient({ data: null, error: other });
    await expect(rpc('find_profile_by_email', { p_email: 'a@b.c' }, client)).rejects.toBe(other);
  });

  it('throws the PostgREST error instead of returning it', async () => {
    const error = { message: 'permission denied for function find_profile_by_email', code: '42501' };
    const { client } = fakeClient({ data: null, error });
    await expect(rpc('find_profile_by_email', { p_email: 'a@b.c' }, client)).rejects.toBe(error);
  });
});

describe('signInWithOAuthRedirect() (plan B4)', () => {
  it('returns SupabaseDisabledError without a client, never touching the SDK', async () => {
    const result = await signInWithOAuthRedirect('google', 'https://example.com/auth/callback/', null);
    expect(result.error).toBeInstanceOf(SupabaseDisabledError);
  });

  it('calls auth.signInWithOAuth with the provider and an explicit redirectTo', async () => {
    const { client, signInWithOAuth } = fakeAuthClient({ data: { provider: 'google', url: 'https://x' }, error: null });
    const result = await signInWithOAuthRedirect('google', 'https://example.com/auth/callback/', client);
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://example.com/auth/callback/' },
    });
    expect(result.error).toBeNull();
  });

  it('surfaces the SDK error instead of throwing', async () => {
    const error = { message: 'oauth not configured' };
    const { client } = fakeAuthClient({ data: { provider: null, url: null }, error });
    const result = await signInWithOAuthRedirect('google', 'https://example.com/auth/callback/', client);
    expect(result.error).toBe(error);
  });
});

describe('onPasswordRecovery() (plan B4)', () => {
  it('is a no-op (returns a callable unsubscribe) without a client', () => {
    const unsubscribe = onPasswordRecovery(() => {}, null);
    expect(() => unsubscribe()).not.toThrow();
  });

  it('invokes the callback only on the PASSWORD_RECOVERY event, not others', () => {
    const { client, emit } = fakeAuthStateClient();
    const cb = vi.fn();
    onPasswordRecovery(cb, client);

    emit('SIGNED_IN');
    expect(cb).not.toHaveBeenCalled();

    emit('PASSWORD_RECOVERY');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('the returned unsubscribe stops the underlying subscription', () => {
    const { client, unsubscribe } = fakeAuthStateClient();
    const stop = onPasswordRecovery(() => {}, client);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
