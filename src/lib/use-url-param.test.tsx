// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUrlParam } from './use-url-param';

/**
 * Plan B9: the expenses list island's event filter is held in URL state
 * (`?event=<id>`), same spirit as `use-data-table-url-state.ts` but for a
 * single controlled `<select>` outside `<DataTable>`'s own sort/global-
 * filter state. Behavior contracts:
 *   1. Reads the initial value from the URL on mount.
 *   2. Writing a non-default value sets the param via `replaceState` (no new
 *      history entry); writing the default value removes the param instead
 *      of writing an empty one.
 *   3. Restores the value on `popstate` (back/forward navigation).
 */
function Harness({ name, defaultValue = '' }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useUrlParam(name, defaultValue);
  return (
    <div>
      <span data-testid="value">{value}</span>
      <button onClick={() => setValue('ev1')}>set ev1</button>
      <button onClick={() => setValue(defaultValue)}>reset</button>
    </div>
  );
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('useUrlParam', () => {
  it('reads the initial value from the URL on mount', () => {
    window.history.replaceState(null, '', '/expenses/list?event=ev1');
    render(<Harness name="event" />);
    expect(screen.getByTestId('value')).toHaveTextContent('ev1');
  });

  it('defaults to the given default when the param is absent', () => {
    window.history.replaceState(null, '', '/expenses/list');
    render(<Harness name="event" defaultValue="all" />);
    expect(screen.getByTestId('value')).toHaveTextContent('all');
  });

  it('writes a non-default value into the URL via replaceState (no new history entry)', async () => {
    window.history.replaceState(null, '', '/expenses/list');
    const before = window.history.length;
    const user = userEvent.setup();
    render(<Harness name="event" defaultValue="all" />);

    await user.click(screen.getByRole('button', { name: 'set ev1' }));

    expect(screen.getByTestId('value')).toHaveTextContent('ev1');
    expect(new URLSearchParams(window.location.search).get('event')).toBe('ev1');
    expect(window.history.length).toBe(before);
  });

  it('removes the param instead of writing the default value back', async () => {
    window.history.replaceState(null, '', '/expenses/list?event=ev1');
    const user = userEvent.setup();
    render(<Harness name="event" defaultValue="all" />);

    await user.click(screen.getByRole('button', { name: 'reset' }));

    expect(screen.getByTestId('value')).toHaveTextContent('all');
    expect(new URLSearchParams(window.location.search).has('event')).toBe(false);
  });

  it('restores the value on popstate (back/forward navigation)', () => {
    window.history.replaceState(null, '', '/expenses/list?event=ev1');
    render(<Harness name="event" defaultValue="all" />);
    expect(screen.getByTestId('value')).toHaveTextContent('ev1');

    act(() => {
      window.history.replaceState(null, '', '/expenses/list');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(screen.getByTestId('value')).toHaveTextContent('all');
  });
});
