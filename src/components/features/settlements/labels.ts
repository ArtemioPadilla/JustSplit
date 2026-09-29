/**
 * How the settlements island names a person. The viewer is always "you" (or
 * "You" at the start of a sentence), never their own profile name; everyone
 * else is their profile name, or "Unknown" when the profile could not be read.
 * Identity comes from the session (`$user`), never from a prop default.
 */
export function personName(
  userId: string,
  viewerId: string | undefined,
  names: Record<string, string>,
  options: { capitalize?: boolean } = {},
): string {
  if (viewerId && userId === viewerId) return options.capitalize ? 'You' : 'you';
  return names[userId] ?? 'Unknown';
}

/** `USD 30.00` — every amount carries its currency code (never a bare number or a symbol alone). */
export function money(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}
