import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** First letters of up to two words — the Avatar fallback when there's no photo. */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

interface UserAccountMenuProps {
  name: string;
  avatarUrl?: string;
}

/**
 * The signed-in half of UserMenuIsland: avatar + name trigger, a dropdown
 * with sign-out. Split into its own module (plan B7/B19 "Header weight") so
 * UserMenuIsland.tsx can load it via `React.lazy` — the Base UI
 * dropdown-menu + avatar primitives it pulls in are the ~48.6 kB gz measured
 * in B6/B19, and a signed-out visitor (every visitor on a page with no
 * active session, which is most page loads) never needs any of it.
 *
 * No ErrorBoundary here: UserMenuIsland.tsx already wraps its whole render
 * tree (including the Suspense boundary around this component) in one,
 * per plan B6's "every mounted island wraps ErrorBoundary" rule — wrapping
 * twice would just catch the same error twice.
 */
export default function UserAccountMenu({ name, avatarUrl }: UserAccountMenuProps) {
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const { signOut } = await import('@/stores/auth');
      await signOut();
      // AuthBridge's own onAuthStateChanged listener (in whichever route
      // island mounted AuthIsland) sets $user back to null; UserMenuIsland
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
