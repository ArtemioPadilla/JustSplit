import { describe, expect, it } from 'vitest';
import source from './HydrationCanary.tsx?raw';

describe('HydrationCanary', () => {
  it('listens for window error events via disposer d.on()', () => {
    // Since the disposer pattern is used, the source calls d.on(window, 'error', ...)
    // rather than window.addEventListener directly.
    expect(source).toMatch(/d\.on\(window,\s*['"]error['"]/);
  });

  it('removes the listener on cleanup via disposer (no leak)', () => {
    // The disposer pattern calls d.on(window, 'error', ...) which registers
    // removeEventListener internally. The test verifies the disposer is used
    // and that dispose is returned as the useEffect cleanup.
    expect(source).toMatch(/createDisposer/);
    expect(source).toMatch(/return d\.dispose/);
  });

  it('matches React hydration error signatures', () => {
    expect(source).toMatch(/Hydration failed/);
    expect(source).toMatch(/Text content does not match/);
  });

  it('matches minified React production error codes', () => {
    expect(source).toMatch(/Minified React error #418/);
  });

  it('writes to sessionStorage for FeedbackFAB pickup', () => {
    expect(source).toMatch(/sessionStorage\.setItem\(['"]feedbackfab\.pending-report['"]/);
  });

  it('imports from @/lib/report-issue', () => {
    expect(source).toMatch(/from ['"]@\/lib\/report-issue['"]/);
  });

  it('imports createDisposer from @/lib/disposer', () => {
    expect(source).toMatch(/from ['"]@\/lib\/disposer['"]/);
  });

  it('renders null (no visible output)', () => {
    expect(source).toMatch(/return null/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });
});
