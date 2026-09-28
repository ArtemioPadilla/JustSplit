import * as React from 'react';
import { useStore } from '@nanostores/react';
import { $preferredCurrency } from '@/stores/preferences';
import { fetchExchangeRate } from './rates';

export interface DisplayConversion {
  /** Synchronous conversion into the display currency — never call before `ready`. */
  convert: (amount: number, currency: string) => number;
  /** True once every distinct currency in the input list has a resolved rate. */
  ready: boolean;
  /** True if any resolved rate was a fallback (ADR 0007 honesty marker, ticker parity). */
  approximate: boolean;
  /** Forces a fresh fetch (pairs with `clearRateCache()` for a "Refresh rates" action). */
  refresh: () => void;
}

/**
 * Display-currency conversion for the B8a dashboard selectors (plan B8b).
 * Given the distinct expense currencies in view and `$preferredCurrency`
 * (B5b), resolves a rate for every one of them through `fetchExchangeRate`
 * (B16 — already coalesces concurrent calls per base currency) and returns a
 * SYNCHRONOUS `convert`, so the pure selectors in `src/domain/dashboard.ts`
 * never need to know about promises.
 *
 * Honesty rule (spec, ticker parity): callers must not show a converted
 * number before `ready` — show a skeleton, or the raw amount clearly
 * labelled with its own currency instead. `convert` still returns a safe
 * (unconverted) fallback value even when called too early, so a caller that
 * forgets to gate on `ready` degrades to "wrong number" rather than a crash.
 */
interface ResolvedRates {
  /** The exact request these rates answer — see `currentKey` below. */
  key: string;
  rates: Record<string, { rate: number; isFallback: boolean }>;
}

export function useDisplayConversion(currencies: string[]): DisplayConversion {
  const target = useStore($preferredCurrency);
  const [resolved, setResolved] = React.useState<ResolvedRates | null>(null);
  const [nonce, setNonce] = React.useState(0);

  // `currencies` is a plain array rebuilt every render by the caller — its
  // joined value is the real identity for the memo/effect below. Computed as
  // a plain identifier (not inline in a dependency array): the
  // react-hooks/use-memo lint rule requires dependency-array entries to be
  // simple expressions, not call expressions like `.join(',')`.
  const currenciesKey = currencies.join(',');

  const distinct = React.useMemo(
    () => Array.from(new Set(currencies)).filter((code) => code !== target).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currenciesKey is currencies' real identity
    [currenciesKey, target],
  );
  const distinctKey = distinct.join(',');

  // Coordinator review fix: identifies exactly which request `resolved`
  // answers. `ready`/`rates` below are derived from comparing this to
  // `resolved.key` DURING RENDER — never from a separate `ready` state flag
  // set later by the effect. The bug this replaces: `target`/`distinct` can
  // change on a render that commits BEFORE the effect (which only runs
  // after that commit) gets a chance to invalidate the old `ready`/`rates`
  // state, so for one render `ready` read `true` while `rates` still held
  // the PREVIOUS target's numbers — `convert` then silently multiplied by
  // the wrong rate under the new currency's label. Keying `resolved` and
  // comparing it to `currentKey` on every render closes that window
  // entirely: a render with a new `currentKey` is `ready: false`
  // immediately, with no dependency on effect timing.
  const currentKey = `${target}|${distinctKey}|${nonce}`;

  React.useEffect(() => {
    let cancelled = false;

    if (distinct.length === 0) {
      setResolved({ key: currentKey, rates: {} });
      return undefined;
    }

    Promise.all(
      distinct.map(async (code) => {
        const result = await fetchExchangeRate(code, target);
        return [code, result] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setResolved({ key: currentKey, rates: Object.fromEntries(entries) });
    });

    return () => {
      cancelled = true;
    };
    // `distinct`/`target` fold into `currentKey`, the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const ready = resolved?.key === currentKey;
  // Memoized (not a bare ternary): an inline `{}` fallback would get a new
  // identity every render while `!ready`, defeating the `useCallback` below.
  const emptyRates = React.useMemo<Record<string, { rate: number; isFallback: boolean }>>(() => ({}), []);
  const rates = ready ? resolved!.rates : emptyRates;

  const convert = React.useCallback(
    (amount: number, currency: string) => {
      if (currency === target) return amount;
      const rate = rates[currency];
      return rate ? amount * rate.rate : amount;
    },
    [rates, target],
  );

  const refresh = React.useCallback(() => setNonce((n) => n + 1), []);

  const approximate = Object.values(rates).some((r) => r.isFallback);

  return { convert, ready, approximate, refresh };
}
