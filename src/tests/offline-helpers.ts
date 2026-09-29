import { act } from '@testing-library/react';

/**
 * Test helper for B19c ("writes require a connection", ADR 0015): flips
 * `navigator.onLine` and fires the matching window event the way a browser
 * does, inside `act` so React re-renders before the next assertion. jsdom's
 * `onLine` is a prototype getter, so this shadows it on the instance and
 * `restoreOnLine()` removes the shadow again.
 */
export function setOnLine(value: boolean): void {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

/** Back to jsdom's own value (online), without firing an event. */
export function restoreOnLine(): void {
  Reflect.deleteProperty(navigator, 'onLine');
}

/** The sentence every write surface shows while offline (`OFFLINE_WRITE_MESSAGE`); spelled out here so a copy change is a deliberate test edit. */
export const OFFLINE_SENTENCE = "You're offline. Changes can't be saved until you reconnect.";
