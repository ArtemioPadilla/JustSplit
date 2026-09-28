import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCAL_SUPABASE_URL, resolveSupabaseEnv } from './env';

describe('resolveSupabaseEnv (plan B2a)', () => {
  it('is disabled when neither value is set (the ci.yml build)', () => {
    expect(resolveSupabaseEnv({})).toEqual({ enabled: false, url: '', key: '', local: false });
  });

  it('is disabled when only one of the two values is set', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_URL: 'https://x.supabase.co' }).enabled).toBe(false);
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_KEY: 'k' }).enabled).toBe(false);
  });

  it('treats whitespace-only values as missing', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_URL: '  ', PUBLIC_SUPABASE_KEY: ' ' }).enabled).toBe(false);
  });

  it('is enabled with both values, trimmed', () => {
    const env = resolveSupabaseEnv({ PUBLIC_SUPABASE_URL: ' https://x.supabase.co ', PUBLIC_SUPABASE_KEY: 'k\n' });
    expect(env).toEqual({ enabled: true, url: 'https://x.supabase.co', key: 'k', local: false });
  });

  it('PUBLIC_SUPABASE_LOCAL=true defaults the URL to the supabase start stack', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: 'true', PUBLIC_SUPABASE_KEY: 'local-anon' })).toEqual({
      enabled: true,
      url: LOCAL_SUPABASE_URL,
      key: 'local-anon',
      local: true,
    });
  });

  it('the local switch never supplies a key: without one it stays disabled', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: 'true' }).enabled).toBe(false);
  });

  it('an explicit URL wins over the local default', () => {
    const env = resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: 'true', PUBLIC_SUPABASE_URL: 'http://localhost:9999', PUBLIC_SUPABASE_KEY: 'k' });
    expect(env.url).toBe('http://localhost:9999');
  });

  it('ignores the local switch in production builds', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: 'true', PUBLIC_SUPABASE_KEY: 'k', PROD: true }).enabled).toBe(false);
  });

  it('only the literal "true" turns the local switch on', () => {
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: '1' }).local).toBe(false);
    expect(resolveSupabaseEnv({ PUBLIC_SUPABASE_LOCAL: 'false' }).local).toBe(false);
  });

  it('the data layer hardcodes no JWT (keys come from the environment only)', () => {
    for (const file of ['env.ts', 'client.ts', 'adapter.ts']) {
      const src = readFileSync(resolve(__dirname, file), 'utf8');
      expect(src, file).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./);
      expect(src, file).not.toMatch(/sb_(publishable|secret)_[A-Za-z0-9_-]{10,}/);
    }
  });
});
