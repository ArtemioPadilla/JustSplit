/**
 * Which sign-in providers this build offers (plan B20a, owner decision
 * 2026-10-03: no Google sign-in for now).
 *
 * `PUBLIC_AUTH_GOOGLE` is a BUILD-time flag, in the same family as the public
 * Supabase pair (a repository variable in the deploy workflow, never a secret):
 * only the exact string 'true' turns Google on, anything else, including unset,
 * is off. It must be on only after the Supabase Google provider is configured
 * (SETUP.md, "Enable Google later"), otherwise the button would lead to an error.
 * The flag hides UI; the provider itself stays disabled in Supabase, which is
 * what actually refuses a Google sign-in (RLS is still the only authorization).
 */

/** Pure resolver, unit-testable without `import.meta.env`. */
export function resolveGoogleSignIn(value: string | undefined): boolean {
  return value === 'true';
}

/**
 * Read at call time (not at module load) so tests can stub the variable; in a
 * build Vite replaces the property with a literal, so the disabled branch is
 * dead code and the Google button, its handler and its copy are not shipped.
 */
export function isGoogleSignInEnabled(): boolean {
  return resolveGoogleSignIn(import.meta.env.PUBLIC_AUTH_GOOGLE as string | undefined);
}
