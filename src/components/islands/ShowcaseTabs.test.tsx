// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShowcaseTabs from './ShowcaseTabs';

/**
 * Plan A7: the /showcase Tabs demo. Its point is the SELECTED state B14
 * fixed: Base UI 1.0.0-rc.0 marks the current tab `data-active` (there is no
 * `data-selected`), and the trigger styles key off that attribute, so exactly
 * one tab at a time carries it, and it follows the selection with the mouse
 * and the keyboard.
 */
describe('ShowcaseTabs', () => {
  it('shows the first tab as selected, with only its panel', () => {
    render(<ShowcaseTabs />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('data-active');
    for (const other of tabs.slice(1)) {
      expect(other).toHaveAttribute('aria-selected', 'false');
      expect(other).not.toHaveAttribute('data-active');
    }
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
  });

  it('moves the selected state (data-active) and the panel with a click', async () => {
    const user = userEvent.setup();
    render(<ShowcaseTabs />);
    const [first, second] = screen.getAllByRole('tab') as [HTMLElement, HTMLElement];
    const firstPanel = screen.getByRole('tabpanel').textContent;

    await user.click(second);

    expect(second).toHaveAttribute('data-active');
    expect(first).not.toHaveAttribute('data-active');
    expect(screen.getAllByRole('tab').filter((t) => t.hasAttribute('data-active'))).toHaveLength(1);
    expect(screen.getByRole('tabpanel').textContent).not.toBe(firstPanel);
  });

  // Base UI Tabs uses manual activation: arrows move focus, Enter/Space select.
  it('moves focus with the arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    render(<ShowcaseTabs />);
    const [first, second] = screen.getAllByRole('tab') as [HTMLElement, HTMLElement];
    first.focus();

    await user.keyboard('{ArrowRight}');
    expect(second).toHaveFocus();
    expect(first).toHaveAttribute('data-active');

    await user.keyboard('{Enter}');
    expect(second).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('data-active');
    expect(first).not.toHaveAttribute('data-active');
  });
});
