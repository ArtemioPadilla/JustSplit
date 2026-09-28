// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from './switch';

describe('Switch (behavior)', () => {
  it('renders a switch role, unchecked when controlled false', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeInTheDocument();
    expect(sw).not.toBeChecked();
  });

  it('calls onCheckedChange with true when toggled on from a click', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true, expect.anything());
  });

  it('calls onCheckedChange with false when toggled off from a click', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch');
    expect(sw).toBeChecked();
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  });

  it('does not fire onCheckedChange when disabled', () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} disabled onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
