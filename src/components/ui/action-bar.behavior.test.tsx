// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ActionBar } from './action-bar';
import { Button } from './button';

describe('ActionBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    const { container } = render(<ActionBar selectedCount={0} onClearSelection={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the "N items selected" count once 1+ items are selected', () => {
    render(<ActionBar selectedCount={3} onClearSelection={() => {}} />);
    expect(screen.getByText('3 items selected')).toBeInTheDocument();
  });

  it('uses singular copy for a count of 1', () => {
    render(<ActionBar selectedCount={1} onClearSelection={() => {}} />);
    expect(screen.getByText('1 item selected')).toBeInTheDocument();
  });

  it('announces the count via a live region', () => {
    render(<ActionBar selectedCount={2} onClearSelection={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('2 items selected');
  });

  it('toggles visibility as selectedCount changes (rerender)', () => {
    const { rerender, container } = render(<ActionBar selectedCount={0} onClearSelection={() => {}} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ActionBar selectedCount={5} onClearSelection={() => {}} />);
    expect(screen.getByText('5 items selected')).toBeInTheDocument();
    rerender(<ActionBar selectedCount={0} onClearSelection={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismiss calls onClearSelection', async () => {
    const onClearSelection = vi.fn();
    const user = userEvent.setup();
    render(<ActionBar selectedCount={2} onClearSelection={onClearSelection} />);
    await user.click(screen.getByLabelText('Clear selection'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders bulk-action children and fires their handlers', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <ActionBar selectedCount={4} onClearSelection={() => {}}>
        <Button variant="destructive" onClick={onDelete}>
          Delete
        </Button>
      </ActionBar>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
