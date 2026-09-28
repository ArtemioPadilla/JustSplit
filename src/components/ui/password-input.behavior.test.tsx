// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordInput } from './password-input';

describe('PasswordInput (behavior)', () => {
  it('renders masked (type="password") by default', () => {
    render(<PasswordInput aria-label="Password" defaultValue="hunter2" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('reveals the value as plain text when the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="hunter2" />);
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');
  });

  it('toggling again re-masks the value', async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Password" defaultValue="hunter2" />);
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await user.click(toggle);
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });
});
