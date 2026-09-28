import { describe, it, expect, vi, beforeEach } from 'vitest';
import { track, initAnalytics } from './analytics';

describe('analytics skeleton', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('track is a no-op when the flag is off', () => {
    // PUBLIC_FLAG_ANALYTICS is unset in test env
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    track('something', { foo: 1 });
    // Should not invoke any provider; should not throw
    expect(info).not.toHaveBeenCalled();
  });

  it('initAnalytics returns false when the flag is off', () => {
    expect(initAnalytics()).toBe(false);
  });
});
