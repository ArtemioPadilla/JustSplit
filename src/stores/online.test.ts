import { describe, expect, it, beforeEach } from 'vitest';
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
