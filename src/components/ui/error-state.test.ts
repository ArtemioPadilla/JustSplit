import { describe, expect, it } from 'vitest';
import source from './error-state.tsx?raw';

describe('ErrorState', () => {
  it('exports ErrorState', () => {
    expect(source).toMatch(/export\s*\{[^}]*ErrorState/);
  });

  it('uses cn from @/lib/utils', () => {
    expect(source).toMatch(/from ['"]@\/lib\/utils['"]/);
  });

  it('does not import from @radix-ui', () => {
    expect(source).not.toMatch(/@radix-ui/);
  });

  it('does not import from framer-motion', () => {
    expect(source).not.toMatch(/framer-motion/);
  });

  it('has role="alert" for accessibility', () => {
    expect(source).toMatch(/role=["']alert["']/);
  });

  it('uses destructive tokens for error theming', () => {
    expect(source).toMatch(/destructive/);
  });

  it('has an action slot', () => {
    expect(source).toMatch(/action/);
  });

  it('has a hint slot for explanatory text', () => {
    expect(source).toMatch(/hint/);
  });
});
