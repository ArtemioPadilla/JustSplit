import { describe, expect, it, beforeEach } from 'vitest';
import {
  $installPrompt,
  $needsRefresh,
  markNeedsRefresh,
  activateUpdate,
  setUpdateActivator,
} from './install';

// vitest runs in Node (environment: 'node'), so window is not defined.
// The module-level `if (typeof window !== 'undefined')` guards in install.ts
// keep the event-listener registration from executing here — only the pure
// atom and function logic is exercised.

describe('$installPrompt', () => {
  beforeEach(() => {
    $installPrompt.set(null);
  });

  it('starts null', () => {
    expect($installPrompt.get()).toBeNull();
  });

  it('can be set to a value and read back', () => {
    const fake = { type: 'beforeinstallprompt' } as unknown as BeforeInstallPromptEvent;
    $installPrompt.set(fake);
    expect($installPrompt.get()).toBe(fake);
  });

  it('can be cleared back to null', () => {
    const fake = { type: 'beforeinstallprompt' } as unknown as BeforeInstallPromptEvent;
    $installPrompt.set(fake);
    $installPrompt.set(null);
    expect($installPrompt.get()).toBeNull();
  });
});

describe('$needsRefresh + markNeedsRefresh', () => {
  beforeEach(() => $needsRefresh.set(false));

  it('starts false', () => {
    expect($needsRefresh.get()).toBe(false);
  });

  it('flips to true when markNeedsRefresh is called', () => {
    markNeedsRefresh();
    expect($needsRefresh.get()).toBe(true);
  });

  it('can be reset to false', () => {
    markNeedsRefresh();
    $needsRefresh.set(false);
    expect($needsRefresh.get()).toBe(false);
  });
});

describe('activateUpdate', () => {
  it('calls the registered activator function', async () => {
    let called = false;
    setUpdateActivator(async () => {
      called = true;
    });
    await activateUpdate();
    expect(called).toBe(true);
  });

  it('calls the most-recently-registered activator', async () => {
    const log: number[] = [];
    setUpdateActivator(async () => { log.push(1); });
    setUpdateActivator(async () => { log.push(2); });
    await activateUpdate();
    expect(log).toEqual([2]);
  });
});
