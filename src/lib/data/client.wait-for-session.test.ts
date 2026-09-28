import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { SupabaseDisabledError, waitForSession } from './client';

/**
 * Plan B4 callback race: supabase-js finishes the PKCE code exchange
 * (`detectSessionInUrl`) asynchronously after the client is created, and
 * `getSession()` resolves only after that initialization. Navigating away
 * before it resolves aborts the exchange and the sign-in is lost.
 */
describe('waitForSession() (plan B4)', () => {
  it('resolves only after getSession() resolves, reporting a session', async () => {
    let release!: (v: unknown) => void;
    const getSession = vi.fn(() => new Promise((r) => (release = r)));
    const client = { auth: { getSession } } as unknown as SupabaseClient;
    let settled = false;
    const p = waitForSession(client).then((v) => {
      settled = true;
      return v;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    release({ data: { session: { user: { id: 'u1' } } }, error: null });
    await expect(p).resolves.toEqual({ signedIn: true, error: null });
  });

  it('reports no session and the exchange error', async () => {
    const error = new Error('invalid flow state');
    const client = { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error }) } } as unknown as SupabaseClient;
    await expect(waitForSession(client)).resolves.toEqual({ signedIn: false, error });
  });

  it('without a client reports SupabaseDisabledError', async () => {
    const res = await waitForSession(null);
    expect(res.signedIn).toBe(false);
    expect(res.error).toBeInstanceOf(SupabaseDisabledError);
  });
});
