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
    
    // Look for links instead of buttons
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    
    // Check for "Add Expense" link
    const addExpenseLink = screen.getByRole('link', { name: /add expense/i });
    expect(addExpenseLink).toBeInTheDocument();
    expect(addExpenseLink).toHaveAttribute('href', '/expenses/new');
    
    // Check for "Create Event" link
    const createEventLink = screen.getByRole('link', { name: /create event/i });
    expect(createEventLink).toBeInTheDocument();
    expect(createEventLink).toHaveAttribute('href', '/events/new');
  });
});
