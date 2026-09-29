// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, buttonVariants } from './button';

/**
 * Plan B19c (ADR 0015): a write control that is blocked offline is `aria-disabled`, not `disabled` (a bare
 * `disabled` hides the reason from a screen reader and drops the control from the tab order), so the
 * shared button styles must dim and mark it exactly like the `disabled:` variant does.
 */
describe('button styles for aria-disabled (B19c)', () => {
  it('buttonVariants dims and marks an aria-disabled control like a disabled one', () => {
    const classes = buttonVariants();
    expect(classes).toContain('aria-disabled:opacity-50');
    expect(classes).toContain('aria-disabled:cursor-not-allowed');
  });

  it('Button passes aria-disabled and aria-describedby through and keeps the button focusable', () => {
    render(
      <Button aria-disabled="true" aria-describedby="why">
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-describedby', 'why');
    expect(button).not.toHaveAttribute('disabled');
  });
});
