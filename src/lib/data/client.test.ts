import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
  SupabaseDisabledError,
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
