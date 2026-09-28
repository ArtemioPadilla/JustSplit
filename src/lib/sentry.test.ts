import { describe, it, expect, vi, beforeEach } from 'vitest';
import { captureError, captureMessage, initSentry } from './sentry';

describe('sentry skeleton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('captureError falls back to console.error when Sentry is not initialized', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    captureError(new Error('boom'), { foo: 'bar' });
    expect(spy).toHaveBeenCalledWith('[error]', expect.any(Error), { foo: 'bar' });
  });

  it('captureMessage falls back to console.info', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    captureMessage('something interesting', { count: 1 });
    expect(spy).toHaveBeenCalledWith('[event]', 'something interesting', { count: 1 });
  });

  it('initSentry is a no-op when the flag is off', async () => {
    // PUBLIC_FLAG_SENTRY is unset in test env, so init should silently succeed
    await expect(initSentry()).resolves.toBeUndefined();
  });
});
