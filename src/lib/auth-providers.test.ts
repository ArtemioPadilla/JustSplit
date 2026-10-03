import { afterEach, describe, expect, it, vi } from 'vitest';
import { isGoogleSignInEnabled, resolveGoogleSignIn } from './auth-providers';

/**
 * Plan B20a (owner decision 2026-10-03): Google sign-in is off until the owner
 * sets the Supabase provider up. `PUBLIC_AUTH_GOOGLE` is a BUILD-time flag: only
 * the exact string 'true' turns it on, and the default is off.
 */
describe('resolveGoogleSignIn', () => {
  it("is on only for the exact string 'true'", () => {
    expect(resolveGoogleSignIn('true')).toBe(true);
  });

  it.each([undefined, '', 'false', 'TRUE', 'True', '1', 'yes', 'on', ' true', 'true '])('is off for %j (anything else means off)', (value) => {
    expect(resolveGoogleSignIn(value)).toBe(false);
  });
});

describe('isGoogleSignInEnabled', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off by default', () => {
    vi.stubEnv('PUBLIC_AUTH_GOOGLE', '');
    expect(isGoogleSignInEnabled()).toBe(false);
  });

  it('reads PUBLIC_AUTH_GOOGLE from the build environment', () => {
    vi.stubEnv('PUBLIC_AUTH_GOOGLE', 'true');
    expect(isGoogleSignInEnabled()).toBe(true);
    vi.stubEnv('PUBLIC_AUTH_GOOGLE', 'false');
    expect(isGoogleSignInEnabled()).toBe(false);
  });
});
