import * as React from 'react';

/**
 * Route-guard + role-gating scaffold (#182) — the ONLY gating module.
 *
 * Provider-agnostic: adapt your auth provider's user object to `GuardUser`
 * once, at the context boundary, and gate everything through `hasRole` /
 * `hasFlag` / `<RouteGuard>`.
 *
 * Hard rules (see CLAUDE.md § "Auth gating rules"):
 *  - Permission checks are explicit allowlists / `=== true`. NEVER `!== false`:
 *    an ABSENT field passes `!== false`, silently granting access.
 *  - Identity always comes from the auth context. Never from props defaults,
 *    query params, or placeholder literals.
 *  - Deny by default: no user, unknown role, or missing flag ⇒ blocked.
 */
export interface GuardUser {
  /** Stable user id from the provider — never a hardcoded placeholder. */
  id: string;
  /** Roles granted by the backend. Absent/empty ⇒ no role-gated access. */
  roles?: readonly string[];
  /** Boolean capability flags. Only an explicit `true` grants. */
  flags?: Readonly<Record<string, boolean | undefined>>;
}

/**
 * Explicit allowlist check. Deny when the user is null, has no roles, or
 * none of their roles appears in `allow`.
 */
export function hasRole(
  user: GuardUser | null | undefined,
  allow: readonly string[],
): boolean {
  if (!user || !user.roles || user.roles.length === 0) return false;
  return user.roles.some((r) => allow.includes(r));
}

/**
 * Capability flag check. The absent-field case is the entire reason this
 * helper exists: `user.flags.verified !== false` passes when `verified` is
 * missing — `hasFlag` only passes on an explicit `true`.
 */
export function hasFlag(user: GuardUser | null | undefined, flag: string): boolean {
  return user?.flags?.[flag] === true;
}

export interface RouteGuardProps {
  /** The user from your auth context — pass it down, never re-derive it. */
  user: GuardUser | null | undefined;
  /** Roles that may see the children (explicit allowlist). */
  allow: readonly string[];
  /** Additionally required capability flags (all must be explicitly true). */
  requireFlags?: readonly string[];
  /** Rendered when access is denied. Defaults to rendering nothing. */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Single gating component. Wrap protected UI once per island:
 *
 *   <RouteGuard user={user} allow={['admin', 'editor']} fallback={<SignIn />}>
 *     <AdminPanel />
 *   </RouteGuard>
 */
export function RouteGuard({
  user,
  allow,
  requireFlags = [],
  fallback = null,
  children,
}: RouteGuardProps): React.ReactNode {
  const roleOk = hasRole(user, allow);
  const flagsOk = requireFlags.every((f) => hasFlag(user, f));
  if (!roleOk || !flagsOk) return fallback;
  return children;
}
