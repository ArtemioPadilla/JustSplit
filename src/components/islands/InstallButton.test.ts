import { describe, expect, it } from 'vitest';
import source from './InstallButton.tsx?raw';

describe('InstallButton', () => {
  it('uses $installPrompt store', () => {
    expect(source).toMatch(/\$installPrompt/);
    expect(source).toMatch(/useStore/);
  });

  it('returns null when no prompt is captured', () => {
    expect(source).toMatch(/if\s*\(\s*!prompt\s*\)\s*return\s*null/);
  });

  it('calls prompt() and userChoice', () => {
    expect(source).toMatch(/prompt\.prompt\(\)/);
    expect(source).toMatch(/userChoice/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/from ['"]framer-motion['"]/);
  });

  it('does not use React Context', () => {
    expect(source).not.toMatch(/createContext/);
  });
});
