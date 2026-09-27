// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Form } from '@/components/ui/form';
import { FieldFormItem } from './form-item';
import { fieldTypeZodSchema, type FieldType } from '@/lib/field-type';

// Behavior contracts for the edit/form renderer (ROADMAP Epic 24, contract
// item (c)) — one field definition drives the react-hook-form-wired input.
// Each fieldType gets its own widget behind the same FieldFormItem API; we
// cover the two most structurally different cases (a toggle vs. a
// closed-choice dropdown) rather than every fieldType exhaustively.

const activeFieldType: FieldType = { type: 'boolean', label: 'Active' };
const categoryFieldType: FieldType = {
  type: 'select',
  label: 'Category',
  options: [
    { label: 'Books', value: 'books' },
    { label: 'Music', value: 'music' },
  ],
};

const schema = z.object({
  active: fieldTypeZodSchema(activeFieldType),
  category: fieldTypeZodSchema(categoryFieldType),
});
type Values = z.infer<typeof schema>;

function Harness() {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { active: false, category: 'books' },
  });
  return (
    <Form {...form}>
      <form>
        <FieldFormItem control={form.control} name="active" fieldType={activeFieldType} />
        <FieldFormItem control={form.control} name="category" fieldType={categoryFieldType} />
      </form>
    </Form>
  );
}

describe('<FieldFormItem>', () => {
  it('renders a labeled checkbox for a boolean fieldType and toggles it through Controller', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByText('Active')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0]).not.toBeChecked();

    await user.click(checkboxes[0]!);
    expect(checkboxes[0]).toBeChecked();
  });

  it('renders a <select> populated from a select fieldType.options, defaulted from the form value', () => {
    render(<Harness />);

    // There's only one native <select> in this harness (the category field).
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
    expect((selects[0] as HTMLSelectElement).value).toBe('books');
    expect(screen.getByRole('option', { name: 'Books' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Music' })).toBeInTheDocument();
  });

  // Regression for a real axe-core "select-name" critical failure caught in
  // CI on /gallery/ (ShowcaseFieldType's demo form): FormLabel and
  // FormControl rendered as unassociated siblings — no htmlFor/id link — so
  // a <select> control had no accessible name at all. getByLabelText is the
  // same query axe's label-association check exercises under the hood.
  it('associates FormLabel with its FormControl via htmlFor/id, so the select has an accessible name', () => {
    render(<Harness />);
    const bylabel = screen.getByLabelText('Category');
    expect(bylabel.tagName).toBe('SELECT');
  });
});

// Regression for the SAME class of a11y bug commit 3721d1a fixed
// (FormControl's cloneElement-injected id/aria-describedby/aria-invalid not
// reaching the real focusable control), reintroduced for the number/money/
// percent branch specifically: FieldEditControl spreads `{...a11y}` onto
// `<NumberField>` (Base UI's `NumberField.Root`), which renders a `<div>`
// group wrapper — not the focusable `<input>` — so Base UI's NumberFieldRoot
// forwards `id` to the real input via its own internal context but drops
// `aria-describedby` entirely and computes the real input's own
// `aria-invalid` purely from Base UI's internal Field-validity state (never
// wired up here), which is always `undefined` regardless of what's passed.
describe('<FieldFormItem> number/money/percent a11y (regression for the class of bug commit 3721d1a fixed)', () => {
  const amountFieldType: FieldType = { type: 'number', label: 'Amount', min: 10 };
  const amountSchema = z.object({ amount: fieldTypeZodSchema(amountFieldType) });
  type AmountValues = z.infer<typeof amountSchema>;

  function NumberHarness() {
    const form = useForm<AmountValues>({
      resolver: zodResolver(amountSchema),
      // Violates `min: 10` — validated on mount below to produce a
      // deterministic error without needing a submit button in the harness.
      defaultValues: { amount: 1 },
    });
    React.useEffect(() => {
      void form.trigger('amount');
    }, [form]);
    return (
      <Form {...form}>
        <form>
          <FieldFormItem control={form.control} name="amount" fieldType={amountFieldType} />
        </form>
      </Form>
    );
  }

  it('puts aria-invalid="true" and a matching aria-describedby on the real <input>, not a wrapper div', async () => {
    render(<NumberHarness />);

    // The hidden native <input type="number" aria-hidden> Base UI renders
    // alongside the visible one is excluded from the accessibility tree, so
    // this resolves to the one real, focusable, screen-reader-visible input.
    const input = await screen.findByRole('textbox');
    expect(input.tagName).toBe('INPUT');

    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));

    // FormMessage (form.tsx) renders the Zod error text with its own
    // formMessageId — confirm that id is one of the tokens in the real
    // input's aria-describedby, i.e. the description is both present and
    // correctly linked, not just any truthy string.
    const message = await screen.findByText(/Too small/);
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy!.split(' ')).toContain(message.id);
  });
});

// Bug 2 (functional verification, not just a build-output inspection): the
// 'date' fieldType branch renders DatePicker via React.lazy + Suspense
// (lazy-date-picker.tsx) so react-day-picker only loads for consumers that
// actually configure a date fieldType. If it were still a static/eager
// import, DatePicker's real trigger button would be present synchronously on
// the very first render and the Suspense fallback would never be observable.
describe('<FieldFormItem> date fieldType (Bug 2 — lazy DatePicker)', () => {
  const createdFieldType: FieldType = { type: 'date', label: 'Created' };
  const dateSchema = z.object({ created: fieldTypeZodSchema(createdFieldType) });
  type DateValues = z.infer<typeof dateSchema>;

  function DateHarness() {
    const form = useForm<DateValues>({
      resolver: zodResolver(dateSchema),
      defaultValues: { created: new Date('2026-01-01T00:00:00Z') },
    });
    return (
      <Form {...form}>
        <form>
          <FieldFormItem control={form.control} name="created" fieldType={createdFieldType} />
        </form>
      </Form>
    );
  }

  it(
    'renders the Suspense fallback before the lazy-loaded DatePicker trigger resolves',
    async () => {
      render(<DateHarness />);

      // Synchronously after the initial render, React.lazy's dynamic
      // import() hasn't resolved yet — the Skeleton fallback is what's
      // actually in the DOM, not DatePicker's trigger <button>.
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      // The lazy chunk resolves shortly after — the real trigger button
      // (rendered by DatePicker/PopoverTrigger) eventually replaces it. A
      // generous timeout: this is the first time anything in this test file
      // actually resolves the date-picker chunk (transitively pulling in
      // react-day-picker), which is measurably slower than an already-warm
      // module cache.
      const trigger = await screen.findByRole('button', {}, { timeout: 15000 });
      expect(trigger).toBeInTheDocument();
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    },
    20000,
  );
});
