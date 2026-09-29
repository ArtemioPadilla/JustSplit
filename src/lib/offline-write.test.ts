// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { OFFLINE_SENTENCE, restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { OFFLINE_WRITE_MESSAGE, OfflineWriteError, assertOnline, isOffline, refuseIfOffline, writeErrorMessage } from './offline-write';

/**
 * Plan B19c (risk:high, ADR 0015 "writes require a connection"). Behavior
 * contracts:
 *  - only `navigator.onLine === false` counts as offline (`true` proves nothing,
 *    so it never blocks); a missing `navigator` (SSR) is online;
 *  - `assertOnline()` throws the typed `OfflineWriteError` offline, before any
 *    network call, and nothing when online;
 *  - UI copy maps that error to the one shared sentence and leaves every other
 *    error to the surface's own failure text.
 */
afterEach(() => {
  restoreOnLine();
});

describe('isOffline / assertOnline', () => {
  it('is online by default (jsdom reports onLine = true)', () => {
    expect(isOffline()).toBe(false);
    expect(() => assertOnline()).not.toThrow();
  });

  it('is offline exactly when navigator.onLine is false', () => {
    setOnLine(false);
    expect(isOffline()).toBe(true);
    expect(() => assertOnline()).toThrow(OfflineWriteError);
    setOnLine(true);
    expect(isOffline()).toBe(false);
    expect(() => assertOnline()).not.toThrow();
  });

  it('treats an unreadable onLine as online, never as a reason to block a write', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => undefined });
    expect(isOffline()).toBe(false);
  });
});

describe('OfflineWriteError', () => {
  it('is a named Error whose message is the shared sentence', () => {
    const error = new OfflineWriteError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('OfflineWriteError');
    expect(error.message).toBe(OFFLINE_WRITE_MESSAGE);
  });

  it('the shared sentence is the one the plan and ADR name', () => {
    expect(OFFLINE_WRITE_MESSAGE).toBe(OFFLINE_SENTENCE);
  });
});

describe('writeErrorMessage', () => {
  it('maps OfflineWriteError to the shared sentence', () => {
    expect(writeErrorMessage(new OfflineWriteError(), 'Could not save.')).toBe(OFFLINE_SENTENCE);
  });

  it('keeps the surface own text for every other error, never the raw message', () => {
    expect(writeErrorMessage(new Error('TypeError: Failed to fetch'), 'Could not save.')).toBe('Could not save.');
    expect(writeErrorMessage('boom', 'Could not save.')).toBe('Could not save.');
  });
});

describe('refuseIfOffline', () => {
  function fakeEvent() {
    let prevented = false;
    return {
      preventDefault: () => {
        prevented = true;
      },
      get prevented() {
        return prevented;
      },
    };
  }

  it('lets an online submit through untouched', () => {
    const event = fakeEvent();
    expect(refuseIfOffline(event)).toBe(false);
    expect(event.prevented).toBe(false);
  });

  it('cancels an offline submit and says so, reading the live connection rather than a stale render', () => {
    setOnLine(false);
    const event = fakeEvent();
    expect(refuseIfOffline(event)).toBe(true);
    expect(event.prevented).toBe(true);
    expect(refuseIfOffline()).toBe(true);
  });
});
