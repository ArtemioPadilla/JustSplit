// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LazyDialog } from './lazy-dialog';

/**
 * B19b: the load-on-first-use stand-in for a dialog's trigger, the same pattern
 * B19 used for the date picker. Until the user reaches for it, the page carries
 * only a plain button that reads and looks like the real trigger (same accessible
 * name and classes); hover, focus and touch warm the chunk, the click asks for the
 * real dialog, which mounts already open, and `aria-busy` says so while it loads.
 * The stack behind it (Base UI dialog, floating-ui) is ~25 kB gz on /friends,
 * /profile and /settlements.
 */
type ImplProps = { title: string; defaultOpen?: boolean };
function RealDialog({ title, defaultOpen }: ImplProps) {
  const [open, setOpen] = React.useState(defaultOpen ?? false);
  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Open real
      </button>
      {open && (
        <div role="dialog" aria-label={title}>
          <button type="button" onClick={() => setOpen(false)}>
            Close real
          </button>
        </div>
      )}
    </>
  );
}

function setup() {
  let resolve!: (m: { default: typeof RealDialog }) => void;
  const pending = new Promise<{ default: typeof RealDialog }>((r) => {
    resolve = r;
  });
  const load = vi.fn(() => pending);
  const Impl = React.lazy(load);
  const view = render(
    <LazyDialog
      impl={Impl}
      load={load}
      implProps={{ title: 'Confirm it' }}
      triggerProps={{ className: 'btn-x', 'aria-label': 'Do the thing to Beto' }}
    >
      Do it
    </LazyDialog>,
  );
  return { load, resolve: () => act(async () => resolve({ default: RealDialog })), view };
}

describe('LazyDialog (B19b)', () => {
  it('shows a real button with the trigger’s name, look and popup semantics, and loads nothing yet', () => {
    const { load } = setup();
    const trigger = screen.getByRole('button', { name: 'Do the thing to Beto' });
    expect(trigger).toHaveTextContent('Do it');
    expect(trigger).toHaveClass('btn-x');
    expect(trigger).toHaveAttribute('type', 'button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    ['hovering', (user: ReturnType<typeof userEvent.setup>, el: HTMLElement) => user.hover(el)],
    ['focusing', (_user: ReturnType<typeof userEvent.setup>, el: HTMLElement) => act(() => el.focus())],
  ])('warms the chunk when %s the trigger, without opening anything', async (_name, act_) => {
    const { load } = setup();
    await act_(userEvent.setup(), screen.getByRole('button', { name: 'Do the thing to Beto' }));
    expect(load).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('warms the chunk on touch start', async () => {
    const { load } = setup();
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.touchStart(screen.getByRole('button', { name: 'Do the thing to Beto' }));
    expect(load).toHaveBeenCalled();
  });

  it('is busy from the click until the chunk arrives, then the real dialog is open', async () => {
    const user = userEvent.setup();
    const { resolve } = setup();
    await user.click(screen.getByRole('button', { name: 'Do the thing to Beto' }));

    const busy = screen.getByRole('button', { name: 'Do the thing to Beto' });
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(busy).toHaveTextContent('Do it');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await resolve();
    expect(await screen.findByRole('dialog', { name: 'Confirm it' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open real' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('a chunk that was already warm opens on the click with nothing to wait for', async () => {
    const user = userEvent.setup();
    const { resolve } = setup();
    await user.hover(screen.getByRole('button', { name: 'Do the thing to Beto' }));
    await resolve();
    await user.click(screen.getByRole('button', { name: 'Do the thing to Beto' }));
    expect(await screen.findByRole('dialog', { name: 'Confirm it' })).toBeInTheDocument();
  });

  it('keeps working after the real dialog closes (it stays mounted; only the real trigger remains)', async () => {
    const user = userEvent.setup();
    const { resolve } = setup();
    await user.click(screen.getByRole('button', { name: 'Do the thing to Beto' }));
    await resolve();
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: 'Close real' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Open real' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('does not open while disabled', async () => {
    const user = userEvent.setup();
    const load = vi.fn(() => Promise.resolve({ default: RealDialog }));
    render(
      <LazyDialog impl={React.lazy(load)} load={load} implProps={{ title: 'x' }} triggerProps={{ disabled: true, 'aria-label': 'Nope' }}>
        Nope
      </LazyDialog>,
    );
    await user.click(screen.getByRole('button', { name: 'Nope' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
