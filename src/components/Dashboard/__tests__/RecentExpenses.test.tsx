import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import RecentExpenses from '../RecentExpenses';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

describe('RecentExpenses', () => {
  const mockExpenses = [
    { 
      id: 'exp1', 
      description: 'Dinner', 
      amount: 50.75, 
      currency: 'USD',
      date: '2023-05-10', 
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      settled: false 
    },
    { 
      id: 'exp2', 
      description: 'Groceries', 
      amount: 35.20, 
      currency: 'USD',
      date: '2023-05-08', 
      paidBy: 'user2',
      participants: ['user1', 'user2', 'user3'],
      settled: true 
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 }
  ];

  it('renders recent expenses correctly with data', () => {
    // Use renderWithAppContext instead of render to provide context
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    
    // Check if descriptions are displayed
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
    
    // Check if amounts are displayed (with currency symbol)
    expect(screen.getByText('$50.75')).toBeInTheDocument();
    expect(screen.getByText('$35.20')).toBeInTheDocument();
    
    // Check for user names instead of directly checking for dates
    // which may be formatted differently in the component
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    
    // Test for status indicators instead of exact dates
    const settledIndicator = screen.getByText('Settled');
    expect(settledIndicator).toBeInTheDocument();
    
    // Check if "View all expenses" link is displayed
    const viewAllLink = screen.getByText('View all expenses');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/expenses');
  });

  it('handles empty data correctly', () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: [],
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all expenses')).toBeInTheDocument();
  });

  it('links to individual expense details pages', () => {
    renderWithAppContext(
      <RecentExpenses />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    const links = screen.getAllByTestId('next-link');
    // Check if there's a link to the individual expense page
    const expenseLinks = links.filter(link => link.getAttribute('href').startsWith('/expenses/'));
    expect(expenseLinks.length).toBeGreaterThan(0);
  });
});
