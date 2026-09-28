import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSignedUrl } from '@/lib/data/hooks/useSignedUrl';
import { cn } from '@/lib/utils';

/** The only prefix a genuinely own-uploaded avatar object path can have (ADR 0005/D10). */
const AVATAR_PATH_PREFIX = 'avatars/';
const HTTPS_URL_RE = /^https:\/\//;

/** First letters of up to two words. */
function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export interface UserAvatarProps {
  /**
   * `profiles.avatarUrl` (or the mirrored auth `photoURL`) — see the
   * doc comment below for why this is never trusted as-is.
   */
  src: string | null | undefined;
  /** Used for the initials fallback, and as the default accessible name. */
  name: string;
  /** Defaults to `name`. Pass `""` when `name` is already shown as adjacent text. */
  alt?: string;
  className?: string;
  fallbackClassName?: string;
}

/**
 * The one shared avatar-image resolver (plan B15 follow-up — a regression
 * B15 itself introduced). `profiles.avatarUrl` is USER-WRITABLE
 * (`updateProfile`/`updateDisplayProfile` set it from client input, spec
 * D10's own-row RLS) and, since B15's avatar upload, sometimes holds a
 * PRIVATE storage path (`avatars/{uid}/{uuid}.jpg`) rather than a fetchable
 * URL — never place it into an `<img src>` unchecked:
 *
 *   - `avatars/…` (this app's own upload path): resolved to a short-lived
 *     signed URL via `useSignedUrl` — the SAME mechanism `ReceiptImage`
 *     uses, never a second copy of that resolution logic.
 *   - an `https:` URL (Google OAuth's `photoURL`, or any future https
 *     avatar source): passed through unchanged.
 *   - anything else — `http:`, `javascript:`, `data:`, a path that isn't
 *     this app's own avatar shape, or empty/null — renders the initials
 *     fallback. It never reaches an `<img>`, regardless of what it is.
 *
 * Loading and a failed signed-URL resolution both fall back to the same
 * initials (Base UI's `Avatar.Fallback` already renders whenever no
 * `Avatar.Image` is mounted — see `AvatarRoot`'s default `imageLoadingStatus
 * = 'idle'` — so simply not rendering `AvatarImage` yet/at all is enough).
 */
export function UserAvatar({ src, name, alt, className, fallbackClassName }: UserAvatarProps) {
  const isPath = typeof src === 'string' && src.startsWith(AVATAR_PATH_PREFIX);
  const isHttpsUrl = typeof src === 'string' && HTTPS_URL_RE.test(src);

  const resolved = useSignedUrl(isPath ? src : null);

  let resolvedUrl: string | null = null;
  if (isHttpsUrl) resolvedUrl = src as string;
  else if (isPath && resolved.status === 'ready') resolvedUrl = resolved.url;

  return (
    <Avatar className={className}>
      {resolvedUrl && <AvatarImage src={resolvedUrl} alt={alt ?? name} />}
      <AvatarFallback className={cn(fallbackClassName)}>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
