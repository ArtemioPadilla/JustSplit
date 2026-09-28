// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox (behavior)', () => {
  it('renders a checkbox role, unchecked by default', () => {
    render(<Checkbox />);
    const cb = screen.getByRole('checkbox');
    expect(cb).toBeInTheDocument();
    expect(cb).not.toBeChecked();
  });

  it('toggles checked state on click (uncontrolled)', () => {
    render(<Checkbox />);
    const cb = screen.getByRole('checkbox');
    fireEvent.click(cb);
    expect(cb).toBeChecked();
    fireEvent.click(cb);
    expect(cb).not.toBeChecked();
  });

  it('calls onCheckedChange with the new value when clicked', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('does not fire onCheckedChange when disabled', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
