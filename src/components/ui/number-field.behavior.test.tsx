// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as React from 'react';

import { NumberField } from './number-field';

// Regression for a real axe-core "aria-input-field-name" critical failure
// caught in CI on /gallery/ (ShowcaseAdvanced's demo NumberField, and
// gallery-recipes.ts's dashboard recipe): `id`/`aria-describedby`/
// `aria-invalid` are explicitly forwarded from NumberField's props onto the
// real, focusable BaseNumberField.Input (see the doc comment in
// number-field.tsx for why Base UI's Root doesn't do this on its own) — but
// `aria-label`/`aria-labelledby` were left out of that list, so a caller
// passing `aria-label` directly (the documented, supported way to name a
// standalone NumberField with no surrounding <FormLabel>) landed only on the
// outer Root <div>, leaving the real <input> with no accessible name at all.
describe('<NumberField> accessible name', () => {
  it('forwards a directly-passed aria-label onto the real focusable <input>, not just the Root wrapper', () => {
    render(<NumberField aria-label="Quantity" defaultValue={3} min={0} max={99} />);
    // getByRole('textbox', { name }) only resolves if the *input itself*
    // carries the accessible name — an aria-label sitting on an ancestor
    // <div> would not satisfy this query.
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    expect(input.tagName).toBe('INPUT');
  });

  it('forwards aria-labelledby onto the real <input> the same way', () => {
    render(
      <div>
        <span id="qty-label">Quantity</span>
        <NumberField aria-labelledby="qty-label" defaultValue={1} min={0} max={99} />
      </div>,
    );
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    expect(input.tagName).toBe('INPUT');
  });

  // Regression for a second critical a11y failure the first fix attempt
  // introduced: explicitly passing `id={undefined}` (present key, undefined
  // value) onto BaseNumberField.Input overrides Base UI's own internally
  // `useId()`-generated id for the real <input> — but Decrement/Increment's
  // `aria-controls` still reference that internal id, so it ends up pointing
  // at an <input> with no id at all (axe: "aria-valid-attr-value").
  it('does not blank out the real <input>\'s id when the caller passes no id (so Decrement/Increment aria-controls still resolves)', () => {
    render(<NumberField aria-label="Quantity" defaultValue={3} min={0} max={99} />);
    const input = screen.getByRole('textbox', { name: 'Quantity' });
    const decrement = screen.getByRole('button', { name: 'Decrease' });
    // If the <input>'s id got blanked, this would be null or point nowhere.
    expect(decrement).toHaveAttribute('aria-controls', input.id);
    expect(input.id).not.toBe('');
  });

  // A production build (not reproducible in jsdom — this is an SSR/Base-UI-
  // internal-id-resolution discrepancy, not something React Testing
  // Library's client-only render exercises) showed Root's id (what
  // Decrement/Increment's aria-controls reads) and Input's rendered id
  // attribute diverging specifically when a caller passes an EXTERNAL,
  // already-computed id (exactly what field-type/form-item.tsx's
  // FieldEditControl does via FormControl's cloneElement in form.tsx). This
  // locks in the new behavior — Root/Input/aria-controls must always agree
  // on the exact same id string the wrapper resolves — as a regression test,
  // even though it can't reproduce the original SSR-specific failure mode
  // directly; the real a11y Playwright suite against a built page is what
  // actually caught and re-verified this fix.
  it('uses the exact same id on Root, Input, and Decrement/Increment aria-controls when the caller passes an explicit id', () => {
    render(<NumberField id="amount-field" aria-label="Amount" defaultValue={5} min={0} max={99} />);
    const input = screen.getByRole('textbox', { name: 'Amount' });
    const decrement = screen.getByRole('button', { name: 'Decrease' });
    const increment = screen.getByRole('button', { name: 'Increase' });
    expect(input.id).toBe('amount-field');
    expect(decrement).toHaveAttribute('aria-controls', 'amount-field');
    expect(increment).toHaveAttribute('aria-controls', 'amount-field');
  });
});
