import * as React from 'react';
import { useStore } from '@nanostores/react';
// This island is in the header of every page, public ones included. It reads
// the session atoms from @/stores/session (no SDK) and imports the auth
// actions, which pull @supabase/supabase-js, only when the user signs out.
// scripts/check-auth-bundle.mjs fails the build if a public page loads the
// SDK up front.
import { $authReady, $profile, $user } from '@/stores/session';
import { withBase } from '@/lib/href';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ErrorBoundary from './ErrorBoundary';

/** First letters of up to two words — the Avatar fallback when there's no photo. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * UserMenuIsland — layout island mounted from `SiteHeader.astro` on every
 * page (plan B6, spec D3). A LAYOUT island reads Nano Stores only: it never
 * mounts `AuthIsland`/`<AuthProvider>` (that tree lives inside whichever
 * route island the page happens to render — see `AuthIsland.tsx`) and never
 * mounts `QueryProvider` (guarded by
 * `src/tests/query-provider-boundary.test.ts`, which names this file
 * explicitly). That means this component only ever reflects a session an
 * ALREADY-mounted route island's `AuthBridge` mirrored into these stores; on
 * a page with no such island (e.g. a page with no auth-gated route island
 * yet) it renders the signed-out state, which is also exactly what it must
 * render when Supabase isn't configured for the build at all
 * (`supabaseEnabled === false` — `ci.yml` builds every PR that way) since
 * `$user` simply never leaves its default `null`.
 */
export default function UserMenuIsland() {
  return (
    <ErrorBoundary name="UserMenuIsland">
      <UserMenuInner />
    </ErrorBoundary>
  );
}

function UserMenuInner() {
  const user = useStore($user);
  const profile = useStore($profile);
  const authReady = useStore($authReady);
  const [signingOut, setSigningOut] = React.useState(false);

  if (!authReady || !user) {
    return (
      <a
        href={withBase('/auth/signin/')}
        className="rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-primary"
      >
        Sign in
      </a>
    );
  }

  const name = profile?.name || user.displayName || user.email || 'Account';
  const avatarUrl = profile?.avatarUrl || user.photoURL || undefined;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const { signOut } = await import('@/stores/auth');
      await signOut();
      // AuthBridge's own onAuthStateChanged listener (in whichever route
      // island mounted AuthIsland) sets $user back to null; this component
      // re-renders to the signed-out link on its own — no navigation here.
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Account menu for ${name}`}
      >
        <Avatar className="h-7 w-7">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={signingOut} onClick={handleSignOut}>
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
