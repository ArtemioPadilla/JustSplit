import { expect } from 'vitest';
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

/**
 * Back to jsdom's own value (online). Fires `online` too, because TanStack Query's module-level
 * `onlineManager` follows those events and would otherwise stay "offline" for the next test.
 */
export function restoreOnLine(): void {
  Reflect.deleteProperty(navigator, 'onLine');
  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

/** The sentence every write surface shows while offline (`OFFLINE_WRITE_MESSAGE`); spelled out here so a copy change is a deliberate test edit. */
export const OFFLINE_SENTENCE = "You're offline. Changes can't be saved until you reconnect.";

/**
 * A blocked write control: announced as disabled and described by the shared
 * sentence, and never a bare `disabled` (which would hide the reason from a
 * screen reader and drop the control from the tab order).
 */
export function expectBlocked(control: HTMLElement): void {
  expect(control).toHaveAttribute('aria-disabled', 'true');
  expect(control).not.toHaveAttribute('disabled');
  expect(control).toHaveAccessibleDescription(OFFLINE_SENTENCE);
}

/** The same control once the connection is back: no leftover offline state at all. */
export function expectWritable(control: HTMLElement): void {
  expect(control).not.toHaveAttribute('aria-disabled');
  expect(control).not.toHaveAttribute('disabled');
  expect(control).not.toHaveAttribute('aria-describedby');
}

/**
 * The visible explanations on screen (`<OfflineWriteNotice>` marks itself with
 * `data-offline-notice`). A page owns one for all the controls it shares its
 * state with.
 */
export function visibleNotices(root: ParentNode = document.body): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-offline-notice]'));
}
