import * as React from 'react';
import { isOffline } from './offline-write';
import { useClientPreference } from './use-client-preference';

/**
 * `useCanWrite()` (plan B19c, ADR 0015): the one hook every write control reads.
 * Built on `useClientPreference`, so it is hydration-safe: the server render and
 * the first client render say "can write" (what an online page looks like), then
 * React switches to the real `navigator.onLine`. It listens to the window's own
 * `online`/`offline` events, so controls re-enable on reconnect with no reload
 * and no dependency on the `$online` store having been mounted by the banner.
 */
const getCanWrite = (): boolean => !isOffline();

const subscribe = (onChange: () => void): (() => void) => {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
};

/** Spread onto a blocked control: announced as disabled, described by the visible explanation. Never a bare `disabled`. */
export interface BlockedControlProps {
  'aria-disabled': true;
  'aria-describedby': string;
}

export interface WriteState {
  canWrite: boolean;
  /** The id `<OfflineWriteNotice>` renders with; unique per call, so two surfaces on one page never share it. */
  noticeId: string;
  /** `undefined` while writes are possible, so `{...write.blocked}` is a no-op online. */
  blocked: BlockedControlProps | undefined;
}

export function useCanWrite(): WriteState {
  const canWrite = useClientPreference(getCanWrite, true, subscribe);
  const noticeId = React.useId();
  return {
    canWrite,
    noticeId,
    blocked: canWrite ? undefined : { 'aria-disabled': true, 'aria-describedby': noticeId },
  };
}

/**
 * For a write component that a page may or may not own the connection state for
 * (plan B19c): a page that shows ONE sentence for all its write controls passes
 * its `WriteState` down; standing alone, the component reads the connection itself
 * (`owned`) and shows its own sentence. The hook is always called, never
 * conditionally, so the rules of hooks hold either way.
 */
export function useSharedWrite(pageWrite: WriteState | undefined): { write: WriteState; owned: boolean } {
  const own = useCanWrite();
  return { write: pageWrite ?? own, owned: pageWrite === undefined };
}
