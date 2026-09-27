import { describe, expect, it } from 'vitest';
import source from './UpdateToast.tsx?raw';

describe('UpdateToast', () => {
  it('uses $needsRefresh + activateUpdate', () => {
    expect(source).toMatch(/\$needsRefresh/);
    expect(source).toMatch(/activateUpdate/);
  });

  it('renders the Reload action', () => {
    expect(source).toMatch(/Reload/);
  });

  it('sets role="status" + aria-live="polite" for a11y', () => {
    expect(source).toMatch(/role=["']status["']/);
    expect(source).toMatch(/aria-live=["']polite["']/);
  });

  it('returns null when no refresh is needed', () => {
    expect(source).toMatch(/if\s*\(\s*!needs\s*\)\s*return\s*null/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });

  it('does not use React Context', () => {
    expect(source).not.toMatch(/createContext/);
  });
});
