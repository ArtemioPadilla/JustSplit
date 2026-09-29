// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { ColumnsMenu } from './data-table-columns-menu';

/**
 * Plan B19: the DataTable's "Columns" menu is a Base UI dropdown, whose popup
 * stack was ~50 kB gz on /expenses/list for a control most visits never touch.
 * It loads on the first interaction with its button (hover, focus and touch warm
 * it), and the menu opens as soon as it has. These pin what a user relies on.
 */
type Row = { description: string; amount: number; note: string };
const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'amount', header: 'Amount' },
  { accessorKey: 'note', header: 'Note' },
];

function Harness() {
  const table = useReactTable({ data: [], columns: COLUMNS, getCoreRowModel: getCoreRowModel() });
  return (
    <>
      <ColumnsMenu table={table} />
      <output data-testid="visible">
        {table
          .getAllLeafColumns()
          .filter((c) => c.getIsVisible())
          .map((c) => c.id)
          .join(',')}
      </output>
    </>
  );
}

const WAIT = { timeout: 8000 };
const TEST_TIMEOUT = 20000;

// Warm the code-split chunk once, outside any test's own timeout: under a
// saturated full-suite run its first transform + import can exceed the WAIT
// budget (a test-harness cost, not the user's). The lazy boundary itself is
// pinned statically by src/tests/lazy-boundaries.test.ts; these tests pin the
// behaviour across it, which a warm module cache does not change.
beforeAll(async () => {
  await import('@/components/ui/data-table-columns-menu-impl');
}, 60_000);

describe('ColumnsMenu', () => {
  it('is a real menu button from the first paint, closed', () => {
    render(<Harness />);
    const button = screen.getByRole('button', { name: 'Columns' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it(
    'opens on the first click, with one checked item per hideable column',
    async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Columns' }));

      const menu = await screen.findByRole('menu', undefined, WAIT);
      expect(menu).toBeInTheDocument();
      const items = await screen.findAllByRole('menuitemcheckbox', undefined, WAIT);
      expect(items.map((i) => i.textContent)).toEqual(['Description', 'Amount', 'Note']);
      for (const item of items) expect(item).toHaveAttribute('aria-checked', 'true');
    },
    TEST_TIMEOUT,
  );

  it(
    'toggles a column, and the table reflects it',
    async () => {
      const user = userEvent.setup();
      render(<Harness />);
      expect(screen.getByTestId('visible')).toHaveTextContent('description,amount,note');

      await user.click(screen.getByRole('button', { name: 'Columns' }));
      await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Note' }, WAIT));

      await waitFor(() => expect(screen.getByTestId('visible')).toHaveTextContent('description,amount'), WAIT);
    },
    TEST_TIMEOUT,
  );

  it(
    'closes on Escape and gives focus back to the button',
    async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.click(screen.getByRole('button', { name: 'Columns' }));
      await screen.findByRole('menu', undefined, WAIT);

      await user.keyboard('{Escape}');

      await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument(), WAIT);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Columns' })).toHaveFocus(), WAIT);
    },
    TEST_TIMEOUT,
  );

  it(
    'opens from the keyboard (Enter on the focused button)',
    async () => {
      const user = userEvent.setup();
      render(<Harness />);
      await user.tab();
      expect(screen.getByRole('button', { name: 'Columns' })).toHaveFocus();
      await user.keyboard('{Enter}');
      expect(await screen.findByRole('menu', undefined, WAIT)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});
