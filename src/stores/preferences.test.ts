// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// Aliased: `useTestStorageEngine` is a `@nanostores/persistent` test helper,
// not a React Hook — the `use*` name alone otherwise trips
// react-hooks/rules-of-hooks when called at module top level.
import { cleanTestStorage, useTestStorageEngine as enableTestPersistentStorage } from '@nanostores/persistent';
import type { JustSplitProfile } from '@/schemas/profile';
import { DEFAULT_CURRENCY } from '@/domain/currency';
import { $profile } from './auth';

/**
 * Plan B5b: `$preferredCurrency` follows `$profile.preferences.preferredCurrency`
 * (the profile is the source of truth) and is mirrored into
 * `@nanostores/persistent` storage for first paint, before `$profile` has
 * loaded on a fresh navigation. `useTestStorageEngine`/`cleanTestStorage`
 * are `@nanostores/persistent`'s own test doubles (its README) — no direct
 * `localStorage` mock needed.
 */
enableTestPersistentStorage();

function profile(preferredCurrency: string): JustSplitProfile {
  return {
    id: 'u1',
    apps: [],
    permissions: [],
    preferences: { preferredCurrency },
  };
}

/**
 * A fresh instance of `./preferences`, simulating a cold page load (a
 * distinct `persistentAtom` that re-reads storage at construction time) —
 * `$profile`/`$persistedCurrency` are otherwise the SAME singletons a real
 * navigation's `AuthBridge` would use, so this deliberately only busts the
 * cache for `./preferences` itself. The specifier is a template literal
 * (not a plain string) so `tsc` treats the import as unresolvable-at-compile-
 * time (`Promise<any>`) instead of erroring that the query-stringed path
 * doesn't exist on disk.
 */
async function reimportPreferences(cacheBustId: string) {
  // @vite-ignore — a deliberate cache-busting dynamic specifier, not a glob.
  return import(/* @vite-ignore */ `./preferences?${cacheBustId}`) as Promise<typeof import('./preferences')>;
}

beforeEach(() => {
  cleanTestStorage();
  $profile.set(null);
});

afterEach(() => {
  $profile.set(null);
});

describe('$preferredCurrency', () => {
  it('defaults to DEFAULT_CURRENCY before $profile has loaded and nothing was ever persisted', async () => {
    const { $preferredCurrency } = await import('./preferences');
    expect($preferredCurrency.get()).toBe(DEFAULT_CURRENCY);
  });

  it('follows $profile.preferences.preferredCurrency once the profile loads (profile is the source of truth)', async () => {
    const { $preferredCurrency } = await import('./preferences');
    $profile.set(profile('EUR'));
    expect($preferredCurrency.get()).toBe('EUR');

    $profile.set(profile('MXN'));
    expect($preferredCurrency.get()).toBe('MXN');
  });

  it('mirrors the profile value into persistent storage, so a FRESH module instance sees it even with no $profile loaded yet', async () => {
    const { $preferredCurrency } = await import('./preferences');
    $profile.set(profile('GBP'));
    expect($preferredCurrency.get()).toBe('GBP');

    $profile.set(null); // simulate a fresh navigation: no profile loaded yet
    const fresh = await reimportPreferences('fresh-load-1');
    expect(fresh.$preferredCurrency.get()).toBe('GBP');
  });

  it('falls back to the persisted mirror (not DEFAULT_CURRENCY) when signed out after having had a preference', async () => {
    const { $preferredCurrency } = await import('./preferences');
    $profile.set(profile('JPY'));
    $profile.set(null); // signed out — profile no longer available
    expect($preferredCurrency.get()).toBe('JPY');
  });
});

describe('$rateCache', () => {
  it('starts as an empty Map', async () => {
    const { $rateCache } = await reimportPreferences('rate-cache-1');
    expect($rateCache.get()).toBeInstanceOf(Map);
    expect($rateCache.get().size).toBe(0);
  });

  it('setRateCacheEntry persists an entry, round-tripping through a fresh module load', async () => {
    const { setRateCacheEntry } = await reimportPreferences('rate-cache-2');
    setRateCacheEntry('USD', { rates: { EUR: 0.9 }, timestamp: 1000 });

    const fresh = await reimportPreferences('rate-cache-2-reload');
    const entry = fresh.$rateCache.get().get('USD');
    expect(entry).toEqual({ rates: { EUR: 0.9 }, timestamp: 1000 });
  });
});
