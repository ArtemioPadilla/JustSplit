// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toaster, toast } from './toast';

/**
 * B19b — toast semantics (ADR 0008, "Accessibility and timing").
 *
 * Base UI's `Toast.Root` renders `role="dialog"` (`alertdialog` for a
 * `priority: 'high'` toast). A dialog is what a screen reader announces as a
 * modal-ish surface that wants attention; a "Saved" confirmation is a
 * transient STATUS. So: a plain toast is `role="status"`; only an error
 * (`priority: 'high'`, or the destructive variant `notifyError` sets) is
 * `role="alert"` with `aria-live="assertive"`. Nothing is a dialog. Focus
 * behaviour is Base UI's own and must not change: a toast never takes focus
 * when it appears, stays reachable by keyboard (`tabindex="0"`), and keeps its
 * title/description wired through `aria-labelledby` / `aria-describedby` so a
 * keyboard user who lands on it hears its content.
 * (RTL cleanup unmounts each Toaster; the provider owns the toast list.)
 */
const toastRoots = () => Array.from(document.querySelectorAll<HTMLElement>('.bui-toast'));

describe('a plain toast is a polite status', () => {
  it('renders role="status" holding its title and description, and no dialog role anywhere', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Expense saved', description: 'Tacos was added.' });
    });

    const status = await screen.findByRole('status', { hidden: true });
    expect(status).toHaveTextContent('Expense saved');
    expect(status).toHaveTextContent('Tacos was added.');
    expect(status).toHaveClass('bui-toast');
    expect(screen.queryAllByRole('dialog', { hidden: true })).toEqual([]);
    expect(screen.queryAllByRole('alertdialog', { hidden: true })).toEqual([]);
  });

  it('is not assertive, and carries no dialog-only aria-modal', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Saved' });
    });
    await screen.findByText('Saved');

    const [root] = toastRoots();
    expect(root).toBeDefined();
    expect(root).not.toHaveAttribute('aria-modal');
    expect(root).not.toHaveAttribute('aria-live', 'assertive');
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps the viewport a polite "Notifications" region', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Saved' });
    });
    await screen.findByText('Saved');

    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});

describe('an error toast is an assertive alert', () => {
  it.each([
    ['priority: high (notifyError)', { priority: 'high' as const, data: { variant: 'destructive' as const } }],
    ['the destructive variant alone', { data: { variant: 'destructive' as const } }],
  ])('renders role="alert" aria-live="assertive" and no dialog role for %s', async (_name, extra) => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Could not save', description: 'Try again.', timeout: 0, ...extra });
    });
    await screen.findAllByText('Could not save');

    const [root] = toastRoots();
    expect(root).toHaveAttribute('role', 'alert');
    expect(root).toHaveAttribute('aria-live', 'assertive');
    expect(root).not.toHaveAttribute('aria-modal');
    expect(screen.queryAllByRole('dialog', { hidden: true })).toEqual([]);
    expect(screen.queryAllByRole('alertdialog', { hidden: true })).toEqual([]);
    expect(screen.queryAllByRole('status', { hidden: true })).toEqual([]);
  });
});

describe('focus behaviour is unchanged', () => {
  it.each([
    ['a status toast', { title: 'Saved' }],
    ['an error toast', { title: 'Could not save', priority: 'high' as const, timeout: 0, data: { variant: 'destructive' as const } }],
  ])('%s does not steal focus and stays keyboard reachable, named by its content', async (_name, options) => {
    render(
      <>
        <button type="button">Save</button>
        <Toaster />
      </>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    button.focus();
    expect(button).toHaveFocus();

    act(() => {
      toast(options);
    });
    await screen.findAllByText(options.title);

    expect(button).toHaveFocus();
    const [root] = toastRoots();
    expect(root).toHaveAttribute('tabindex', '0');
    const labelledBy = root!.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).toHaveTextContent(options.title);
  });
});
