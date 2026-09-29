// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { OFFLINE_SENTENCE, restoreOnLine, setOnLine } from '@/tests/offline-helpers';
import { useCanWrite } from './use-can-write';

/**
 * Plan B19c (ADR 0015). Behavior contracts:
 *  - `useCanWrite()` follows the connection with no reload: offline, then
 *    online, then offline again, re-rendering each time;
 *  - it is hydration-safe: the server render (and the first client render)
 *    says "can write", so an SSR'd control never mismatches;
 *  - a blocked control gets `aria-disabled` and `aria-describedby` pointing at
 *    the one visible explanation, never a bare `disabled`; an online control
 *    gets neither;
 *  - each call owns a distinct notice id, so two surfaces on one page never
 *    share an id.
 */
afterEach(() => {
  restoreOnLine();
});

describe('useCanWrite', () => {
  it('starts able to write when the browser is online', () => {
    const { result } = renderHook(() => useCanWrite());
    expect(result.current.canWrite).toBe(true);
    expect(result.current.blocked).toBeUndefined();
  });

  it('offline -> online -> offline, re-rendering each time', () => {
    const { result } = renderHook(() => useCanWrite());

    setOnLine(false);
    expect(result.current.canWrite).toBe(false);

    setOnLine(true);
    expect(result.current.canWrite).toBe(true);

    setOnLine(false);
    expect(result.current.canWrite).toBe(false);

    setOnLine(true);
    expect(result.current.canWrite).toBe(true);
  });

  it('is already blocked on the first client render when the page loads offline', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    const { result } = renderHook(() => useCanWrite());
    expect(result.current.canWrite).toBe(false);
  });

  it('server-renders as able to write, whatever the client will later see (hydration-safe)', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
    function Probe() {
      const { canWrite } = useCanWrite();
      return <span>{canWrite ? 'can-write' : 'blocked'}</span>;
    }
    expect(renderToString(<Probe />)).toContain('can-write');
  });

  it('a blocked control carries aria-disabled and aria-describedby, never a bare disabled', () => {
    const { result } = renderHook(() => useCanWrite());
    setOnLine(false);
    expect(result.current.blocked).toEqual({ 'aria-disabled': true, 'aria-describedby': result.current.noticeId });
    expect(result.current.blocked).not.toHaveProperty('disabled');
  });

  it('gives each call its own notice id', () => {
    const first = renderHook(() => useCanWrite());
    const second = renderHook(() => useCanWrite());
    expect(first.result.current.noticeId).not.toBe(second.result.current.noticeId);
  });
});

describe('OfflineWriteNotice', () => {
  function Surface() {
    const write = useCanWrite();
    return (
      <div>
        <button type="submit" {...write.blocked}>
          Save
        </button>
        <OfflineWriteNotice write={write} />
      </div>
    );
  }

  it('shows the shared sentence only while offline, and the control points at it', () => {
    render(<Surface />);
    expect(screen.queryByText(OFFLINE_SENTENCE)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-disabled');

    setOnLine(false);
    const notice = screen.getByText(OFFLINE_SENTENCE);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-describedby', notice.id);
    expect(button).toHaveAccessibleDescription(OFFLINE_SENTENCE);

    setOnLine(true);
    expect(screen.queryByText(OFFLINE_SENTENCE)).not.toBeInTheDocument();
    expect(button).not.toHaveAttribute('aria-disabled');
    expect(button).not.toHaveAttribute('aria-describedby');
  });
});
