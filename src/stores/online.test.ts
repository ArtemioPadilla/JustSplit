// @vitest-environment jsdom
import { afterEach, describe, expect, it, beforeEach } from 'vitest';
import { restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { $online } from './online';

describe('$online store', () => {
  beforeEach(() => {
    $online.set(true);
  });

  it('defaults to true (so SSR/pre-hydration is clean)', () => {
    expect($online.get()).toBe(true);
  });

  it('can be toggled', () => {
    $online.set(false);
    expect($online.get()).toBe(false);
    $online.set(true);
    expect($online.get()).toBe(true);
  });
});

describe('$online store follows the browser (plan B19c: the same signal the write controls use)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('offline -> online -> offline through the window events, while something is subscribed', () => {
    const seen: boolean[] = [];
    const unbind = $online.listen((value) => seen.push(value));

    setOnLine(false);
    expect($online.get()).toBe(false);
    setOnLine(true);
    expect($online.get()).toBe(true);
    setOnLine(false);
    expect($online.get()).toBe(false);

    expect(seen).toEqual([false, true, false]);
    unbind();
  });

  it('syncs to the real value when it mounts on a page that loaded offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const unbind = $online.listen(() => {});
    expect($online.get()).toBe(false);
    unbind();
  });
});
