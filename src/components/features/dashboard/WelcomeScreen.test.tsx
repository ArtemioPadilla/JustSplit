// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withBase } from '@/lib/href';
import { WelcomeScreen } from './WelcomeScreen';

/**
 * Plan B8b: shown when the signed-in user has no expenses AND no events —
 * unlike the legacy `WelcomeScreen` (the whole marketing landing page for a
 * signed-out visitor, now `landing.astro`'s job), this is the empty-state
 * INSIDE the dashboard, so it drops the "JustSplit" title/tagline copy and
 * keeps only the two CTAs that still make sense once you're already signed
 * in: create your first expense or event.
 */
describe('WelcomeScreen', () => {
  it('renders an empty-state message', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText(/no expenses or events yet/i)).toBeInTheDocument();
  });

  it('renders CTAs to create an expense and an event', () => {
    render(<WelcomeScreen />);

    const addExpense = screen.getByRole('link', { name: /add.*expense/i });
    expect(addExpense).toHaveAttribute('href', withBase('/expenses/new'));

    const createEvent = screen.getByRole('link', { name: /create.*event/i });
    expect(createEvent).toHaveAttribute('href', withBase('/events/new'));
  });
});
