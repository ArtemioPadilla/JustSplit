import { describe, expect, it } from 'vitest';
import source from './OfflineBanner.tsx?raw';

describe('OfflineBanner', () => {
  it('uses the $online Nano Store', () => {
    expect(source).toMatch(/\$online/);
    expect(source).toMatch(/useStore/);
  });

  // "Renders nothing visible online, keeps the status region" is behaviour, pinned by
  // live-banners.screen-reader.test.tsx (plan B19d); a source regex cannot tell the two apart.

  it('sets aria-live="polite" + role="status"', () => {
    expect(source).toMatch(/role=["']status["']/);
    expect(source).toMatch(/aria-live=["']polite["']/);
  });

  it('only animates under motion-safe (prefers-reduced-motion gets an instant pill)', () => {
    expect(source).not.toMatch(/(^|[\s"'`])motion-(preset|duration)-/m);
    expect(source).toMatch(/motion-safe:motion-preset-/);
  });

  it('manages the back-online timer with createDisposer', () => {
    expect(source).toMatch(/createDisposer/);
    expect(source).not.toMatch(/window\.setTimeout|[^.\w]setTimeout\(/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });
});
