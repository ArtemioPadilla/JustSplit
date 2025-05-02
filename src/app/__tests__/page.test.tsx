import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import Home from '../page';
import { renderWithAppContext } from '../../test-utils';

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

describe('Home', () => {
  test('renders heading and description', () => {
    renderWithAppContext(<Home />);
    
    // Your assertions for the home page
    // These will depend on what elements you expect to find
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  
  test('renders the action buttons', () => {
    renderWithAppContext(<Home />);
    
    // Your assertions for action buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
