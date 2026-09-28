import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * UserMenuIsland is in the header of every page, public ones included. It
 * reads the session atoms from `@/stores/session` (no SDK) and loads the auth
 * actions, which pull @supabase/supabase-js, only when the user signs out.
 * The build-output side of this rule is scripts/check-auth-bundle.mjs.
 */
const src = readFileSync(resolve(__dirname, '../components/islands/UserMenuIsland.tsx'), 'utf8');

describe('UserMenuIsland keeps the Supabase SDK off the first paint', () => {
  it('never imports @/stores/auth statically', () => {
    expect(src).not.toMatch(/^\s*import\s[^;]*from\s+['"]@\/stores\/auth['"]/m);
  });

  it('reads the session atoms from @/stores/session', () => {
    expect(src).toMatch(/from\s+['"]@\/stores\/session['"]/);
  });

  it('loads the auth actions lazily for sign-out', () => {
    expect(src).toMatch(/import\(\s*['"]@\/stores\/auth['"]\s*\)/);
  });
});

describe('@/stores/session holds only the atoms', () => {
  const session = readFileSync(resolve(__dirname, '../stores/session.ts'), 'utf8');
  it('imports nothing from the data layer', () => {
    expect(session).not.toMatch(/@\/lib\/data|\.\.\/lib\/data/);
  });
});
