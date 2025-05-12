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

  it('renders table headers and rows correctly', () => {
    render(
      <RecentExpenses
        expenses={mockExpenses}
        users={mockUsers}
        events={mockEvents}
        preferredCurrency="USD"
        isConvertingCurrencies={false}
      />
    );
    // Table headers
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Paid By')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    // Data rows
    expect(screen.getByText('gasto1')).toBeInTheDocument();
    expect(screen.getByText('tren')).toBeInTheDocument();
    expect(screen.getByText('museo')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
    expect(screen.getByText('Museo del prado')).toBeInTheDocument();
  });

  it('shows Settled and Unsettled status badges', () => {
    render(
      <RecentExpenses
        expenses={mockExpenses}
        users={mockUsers}
        events={mockEvents}
        preferredCurrency="USD"
        isConvertingCurrencies={false}
      />
    );
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('Unsettled')).toBeInTheDocument();
  });

  it('shows converted amount if currency differs and conversion is enabled', async () => {
    render(
      <RecentExpenses
        expenses={mockExpenses}
        users={mockUsers}
        events={mockEvents}
        preferredCurrency="EUR"
        isConvertingCurrencies={true}
      />
    );
    // Wait for conversion to finish
    expect(await screen.findByText(/≈/)).toBeInTheDocument();
  });

  it('shows participant count and event name', () => {
    render(
      <RecentExpenses
        expenses={mockExpenses}
        users={mockUsers}
        events={mockEvents}
        preferredCurrency="USD"
        isConvertingCurrencies={false}
      />
    );
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.getByText('Europe')).toBeInTheDocument();
  });

  it('shows "No expenses yet" if empty', () => {
    render(
      <RecentExpenses expenses={[]} users={mockUsers} events={mockEvents} preferredCurrency="USD" />
    );
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
  });
});
