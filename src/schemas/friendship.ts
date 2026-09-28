import { z } from 'zod';
import type { Friendship as UniversalFriendship } from '@cyber-eco/types';

/**
 * `friendships` (plan B3, spec D10) — the universal `Friendship`
 * (`@cyber-eco/types`) unchanged; no JustSplit-only top-level fields, so no
 * overflow keys and no `.omit()` beyond the server-assigned fields.
 */
// No `.passthrough()` here — see `expense.ts` for why the compile-time guard
// below needs the plain (non-indexed) shape.
const FriendshipShapeSchema = z.object({
  id: z.string(),
  // `.refine()` (not `.length()`) so the inferred TS type stays `string[]`
  // rather than a fixed-length tuple — the DB enforces the real invariant
  // (`friendships_two_distinct_users`, `cardinality(users) = 2`).
  users: z.array(z.string()).refine((users) => users.length === 2, 'a friendship has exactly two users'),
  status: z.enum(['pending', 'accepted', 'rejected']),
  requestedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const FriendshipSchema = FriendshipShapeSchema.loose();

export type Friendship = z.infer<typeof FriendshipSchema>;
type _FriendshipShape = z.infer<typeof FriendshipShapeSchema>;

/**
 * Compile-time guard, mirroring `expense.ts`: fails `npm run type-check`
 * (not a runtime check) if `FriendshipSchema` ever drifts from the universal
 * `Friendship` shape.
 */
type _ExpectTrue<T extends true> = T;
export type _UniversalFriendshipCovered = _ExpectTrue<UniversalFriendship extends Omit<_FriendshipShape, 'updatedAt'> ? true : false>;

export const CreateFriendshipInputSchema = FriendshipSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateFriendshipInput = z.infer<typeof CreateFriendshipInputSchema>;
