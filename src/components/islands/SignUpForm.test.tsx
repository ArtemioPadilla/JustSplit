// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));
vi.mock('@/stores/auth', () => ({ signUp }));

import SignUpForm from './SignUpForm';

describe('SignUpForm — validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '' },
    });
  });

  it('shows a validation message and does not sign up when the name is empty', async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByText(/enter your name/i)).toBeInTheDocument();
    expect(signUp).not.toHaveBeenCalled();
  });
});

describe('SignUpForm — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '' },
    });
  });

  it('submits a valid signup, calls signUp and redirects to /', async () => {
    signUp.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => expect(signUp).toHaveBeenCalledWith('ada@example.com', 'longenoughpw', 'Ada'));
    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('shows an error message when signUp rejects (e.g. duplicate email)', async () => {
    signUp.mockRejectedValue(new Error('user_already_exists'));
    const user = userEvent.setup();
    render(<SignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'longenoughpw');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(window.location.href).toBe('');
  });
});

describe('SignUpForm — links', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '', search: '' },
    });
  });

  it('renders a "Sign in" link only when signInHref is provided, and no Facebook/Twitter buttons', () => {
    const { rerender } = render(<SignUpForm />);
    expect(screen.queryByRole('link', { name: /sign in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /facebook/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /twitter/i })).not.toBeInTheDocument();

    rerender(<SignUpForm signInHref="/auth/signin/" />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/auth/signin/');
  });
});
