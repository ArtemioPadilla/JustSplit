// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Toaster, toast } from './toast';

/**
 * Plan B17b — toast topology decision (ADR 0008).
 *
 * No `<Toaster/>` was mounted anywhere in the tree before this issue: every
 * `notifications.ts` toast fired since B8b was invisible. Two separate
 * `createRoot`s on one `document` model the real topology this repo ends up
 * with: BaseLayout mounts exactly one `<ToasterIsland client:idle/>` (its
 * own React root), while every OTHER island — a route island mounted
 * `client:only`, for instance — is its own, independent React root that
 * only ever calls the imperative `toast()`/`notify*` helpers, never renders
 * a `<Toaster/>` of its own.
 */
function FireToastOnMount({ title }: { title: string }) {
  React.useEffect(() => {
    toast({ title });
  }, [title]);
  return null;
}

describe('Toaster topology — one shared manager across independent React roots', () => {
  let containerA: HTMLDivElement;
  let containerB: HTMLDivElement;
  let rootA: Root;
  let rootB: Root;

  beforeEach(() => {
    containerA = document.createElement('div');
    containerB = document.createElement('div');
    document.body.append(containerA, containerB);
    rootA = createRoot(containerA);
    rootB = createRoot(containerB);
  });

  afterEach(() => {
    act(() => {
      rootA.unmount();
      rootB.unmount();
    });
    containerA.remove();
    containerB.remove();
  });

  it('a toast() fired from root A renders inside the <Toaster/> mounted in root B', async () => {
    // Root B is the layout root — it mounts the single shared Toaster.
    act(() => {
      rootB.render(<Toaster />);
    });
    // Root A is a completely separate React root (a different island's tree)
    // that never renders a Toaster — it only fires.
    act(() => {
      rootA.render(<FireToastOnMount title="Fired from root A" />);
    });

    expect(await screen.findByText('Fired from root A')).toBeInTheDocument();
  });

  it('a toast() fired BEFORE the Toaster mounts still renders once it does (manager queues)', async () => {
    // Root A fires first — no <Toaster/> exists anywhere yet, modelling a
    // route island (client:only, hydrates synchronously) racing ahead of
    // BaseLayout's <ToasterIsland client:idle/>.
    act(() => {
      rootA.render(<FireToastOnMount title="Fired before any Toaster mounted" />);
    });
    // The Toaster mounts afterwards, in an entirely separate root.
    act(() => {
      rootB.render(<Toaster />);
    });

    expect(await screen.findByText('Fired before any Toaster mounted')).toBeInTheDocument();
  });

  it('a destructive-variant toast (notifyError\'s data.variant) renders with destructive styling', async () => {
    act(() => {
      rootB.render(<Toaster />);
    });
    act(() => {
      toast({ title: 'Something broke', data: { variant: 'destructive' } });
    });

    const title = await screen.findByText('Something broke');
    const root = title.closest('[data-variant], .bui-toast') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toMatch(/bg-destructive/);
  });

  it('every toast has a close button with an accessible name', async () => {
    act(() => {
      rootB.render(<Toaster />);
    });
    act(() => {
      toast({ title: 'Dismiss me' });
    });

    await screen.findByText('Dismiss me');
    // Base UI's own Close primitive sets `aria-hidden={!expanded}` — the
    // collapsed toast stack (the default, unfocused state) intentionally
    // hides individual close buttons from assistive tech, and un-hides them
    // once the region is expanded (hover, or a keyboard user tabbing into
    // it — ToastViewport's own focus handler). `hidden: true` bypasses that
    // filter here because this test only asserts the button itself carries
    // an accessible name, not that it's reachable in the collapsed state.
    expect(screen.getByRole('button', { name: /dismiss/i, hidden: true })).toBeInTheDocument();
  });
});
