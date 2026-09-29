// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import NotFoundView from './NotFoundView';

/**
 * Plan A7: `NotFoundView` is rendered two ways. Inside a route view (the
 * router already wrapped that in `<main>`) it must not add a second main
 * landmark; as the shell's own top-level content for an unmatched URL
 * (`standalone`) it IS the page's main landmark.
 */
describe('NotFoundView', () => {
  it('nested in a route view: no landmark of its own, still the level-1 heading', () => {
    render(
      <main>
        <NotFoundView />
      </main>,
    );
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back home' })).toBeInTheDocument();
  });

  it('standalone: it is the main landmark', () => {
    render(<NotFoundView standalone />);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });
});
