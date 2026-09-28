import * as React from 'react';

/**
 * Syncs one string URL search param with local state (plan B9: the expenses
 * list island's event filter, `?event=<id>`). Deliberately smaller than
 * `src/components/ui/use-data-table-url-state.ts` — that hook owns
 * `<DataTable>`'s own sort/global-filter/visibility/sizing state; this one
 * is for a single controlled value (a `<select>`) a caller keeps OUTSIDE
 * the table, with no debounce (a select's `onChange` doesn't need one the
 * way a text filter's keystrokes do).
 *
 * Reads the param on mount, writes back via `history.replaceState` (no new
 * history entry per selection — same rationale as `use-data-table-url-state.ts`),
 * and restores the value on `popstate` (back/forward navigation). Writing
 * `defaultValue` back removes the param instead of writing an empty/default
 * string, so the URL stays clean for the common "no filter" case.
 */
export function useUrlParam(name: string, defaultValue = ''): [string, (next: string) => void] {
  const read = React.useCallback((): string => {
    if (typeof window === 'undefined') return defaultValue;
    return new URLSearchParams(window.location.search).get(name) ?? defaultValue;
  }, [name, defaultValue]);

  const [value, setValue] = React.useState<string>(read);

  React.useEffect(() => {
    const onPopState = () => setValue(read());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [read]);

  const write = React.useCallback(
    (next: string) => {
      setValue(next);
      const params = new URLSearchParams(window.location.search);
      if (next && next !== defaultValue) params.set(name, next);
      else params.delete(name);
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    },
    [name, defaultValue],
  );

  return [value, write];
}
