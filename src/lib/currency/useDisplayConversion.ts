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
export function useDisplayConversion(currencies: string[]): DisplayConversion {
  const target = useStore($preferredCurrency);
  const [rates, setRates] = React.useState<Record<string, { rate: number; isFallback: boolean }>>({});
  const [ready, setReady] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);

  const distinct = React.useMemo(
    () => Array.from(new Set(currencies)).filter((code) => code !== target).sort(),
    // `currencies` is a plain array rebuilt every render by the caller; its
    // joined value is the real identity for this memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currencies.join(','), target],
  );

  React.useEffect(() => {
    let cancelled = false;

    if (distinct.length === 0) {
      setRates({});
      setReady(true);
      return undefined;
    }

    setReady(false);
    Promise.all(
      distinct.map(async (code) => {
        const result = await fetchExchangeRate(code, target);
        return [code, result] as const;
      }),
    ).then((entries) => {
      if (cancelled) return;
      setRates(Object.fromEntries(entries));
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
    // `distinct` is a fresh array each render; its joined value + `nonce`
    // (bumped by `refresh()`) are the real dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distinct.join(','), target, nonce]);

  const convert = React.useCallback(
    (amount: number, currency: string) => {
      if (currency === target) return amount;
      const resolved = rates[currency];
      return resolved ? amount * resolved.rate : amount;
    },
    [rates, target],
  );

  const refresh = React.useCallback(() => setNonce((n) => n + 1), []);

  const approximate = Object.values(rates).some((r) => r.isFallback);

  return { convert, ready, approximate, refresh };
}
