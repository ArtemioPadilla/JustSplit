/**
 * useListing — normalize list UI state from raw data + filter state.
 *
 * WHY: Every list view goes through the same set of states:
 *   1. loading  — data hasn't arrived yet
 *   2. error    — fetch failed; show an error card
 *   3. empty-zero      — fetch succeeded, but there are zero items in the source
 *   4. empty-filtered  — items exist, but the active filter matches nothing
 *   5. ready    — we have items to display
 *
 * Without a shared abstraction, each island re-implements these transitions
 * inconsistently: some conflate "zero" with "filtered to empty", others show
 * a loading skeleton after an error, etc. useListing makes the state machine
 * explicit and testable.
 *
 * USAGE:
 *   const listing = useListing({
 *     isLoading: query.isLoading,
 *     error: query.error,
 *     allItems: query.data ?? [],
 *     filteredItems: query.data?.filter(applySearch) ?? [],
 *   });
 *
 *   if (listing.status === 'loading') return <Skeleton />;
 *   if (listing.status === 'error')   return <ErrorState ... />;
 *   if (listing.status === 'empty-zero') return <EmptyState title="No items yet" ... />;
 *   if (listing.status === 'empty-filtered') return <EmptyState title="No results" ... />;
 *   return <List items={listing.items} />;
 *
 * TYPE-SAFETY: The hook is generic — pass your item type as the type parameter:
 *   useListing<Issue>({ ... })
 */

export type ListingStatus =
  | 'loading'
  | 'error'
  | 'empty-zero'
  | 'empty-filtered'
  | 'ready';

export interface ListingInput<T> {
  /** True while the initial fetch is in flight. */
  isLoading: boolean;
  /** Non-null when the fetch has failed. */
  error: Error | null | undefined;
  /**
   * The full unfiltered dataset. Used to distinguish "zero items exist" from
   * "items exist but the current filter matches none of them".
   */
  allItems: T[];
  /**
   * The filtered (and optionally sorted/paginated) subset to display. When no
   * filter is active, pass the same array as `allItems`.
   */
  filteredItems: T[];
}

/** The result of useListing. Discriminate on `status` before reading `items`. */
export type ListingResult<T> =
  | { status: 'loading'; items: never[] }
  | { status: 'error'; items: never[]; error: Error }
  | { status: 'empty-zero'; items: never[] }
  | { status: 'empty-filtered'; items: never[] }
  | { status: 'ready'; items: T[] };

/**
 * Derive the canonical list UI state from raw data + loading/error signals.
 *
 * This is a pure function, not a React hook — it does not call `useState` or
 * `useEffect`. The `use` prefix follows the project convention for composable
 * data-shaping utilities consumed by islands. Tests can call it directly
 * without a React environment.
 */
export function useListing<T>(input: ListingInput<T>): ListingResult<T> {
  const { isLoading, error, allItems, filteredItems } = input;

  // Priority: loading > error > empty > ready.
  // We check loading before error so a retry that is in-flight shows a
  // skeleton rather than the stale error card.
  if (isLoading) {
    return { status: 'loading', items: [] };
  }

  if (error) {
    // Normalise to Error so callers can always access .message.
    const normalised = error instanceof Error ? error : new Error(String(error));
    return { status: 'error', items: [], error: normalised };
  }

  if (allItems.length === 0) {
    // Nothing in the source — zero-data empty state (celebratory / "all clear").
    return { status: 'empty-zero', items: [] };
  }

  if (filteredItems.length === 0) {
    // Items exist but the current filter matches nothing — filtered empty state
    // (actionable / "try a different search").
    return { status: 'empty-filtered', items: [] };
  }

  return { status: 'ready', items: filteredItems };
}
