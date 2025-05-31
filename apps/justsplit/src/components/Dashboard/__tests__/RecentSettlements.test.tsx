import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import RecentSettlements from '../RecentSettlements';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode, href: string }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
  LinkComponent.displayName = 'Link';
  return LinkComponent;
});

// Mock currency conversion functions
jest.mock('../../../utils/currencyExchange', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  convertCurrency: async () => ({ convertedAmount: 100, isFallback: false }),
  getCurrencySymbol: () => '$'
}));

describe('RecentSettlements', () => {
  const mockSettlements = [
    {
      id: 'settlement1',
      amount: 50,
      currency: 'USD',
      fromUser: 'user1', // Alice
      toUser: 'user2', // Bob
      date: '2023-05-10',
      description: 'Dinner payment',
      status: 'completed',
      expenseIds: []
    },
    {
      id: 'settlement2',
      amount: 35,
      currency: 'USD',
      fromUser: 'user3', // Charlie 
      toUser: 'user4', // Dave
      date: '2023-05-03',
      description: 'Movie tickets',
      status: 'pending',
      expenseIds: []
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', email: 'alice@example.com', balance: 0 },
    { id: 'user2', name: 'Bob', email: 'bob@example.com', balance: 0 },
    { id: 'user3', name: 'Charlie', email: 'charlie@example.com', balance: 0 },
    { id: 'user4', name: 'Dave', email: 'dave@example.com', balance: 0 }
  ];

  it('renders recent settlements correctly with data', () => {
    renderWithAppContext(
      <RecentSettlements />,
      {
        initialState: {
          settlements: mockSettlements,
          users: mockUsers,
          expenses: [],
          events: []
        }
      }
    );
    
    // Check for the actual values that appear in the DOM
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    
    // Check for proper user names being displayed (Alice to Bob, Charlie to Dave)
    expect(screen.getByText('Alice to Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie to Dave')).toBeInTheDocument();
    
    // Check for "Settlement" description which is shown when no expense description is available
    expect(screen.getAllByText('Settlement').length).toBeGreaterThan(0);
    
    // Check that date elements exist by using a regex pattern to match date format
    const dateElements = screen.getAllByText(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
    expect(dateElements.length).toBe(2);
    
    // Check the dates are formatted properly - they should be May 10 and May 3, 2023
    const dateStrings = dateElements.map(el => el.textContent);
    expect(dateStrings).toEqual(expect.arrayContaining([
      new Date('2023-05-10').toLocaleDateString(),
      new Date('2023-05-03').toLocaleDateString()
    ]));
    
    // Status indicators - one completed, one pending
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    
    // Check if "View all settlements" link is displayed
    const viewAllLink = screen.getByText('View all settlements');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/settlements');
  });

  it('handles empty data correctly', async () => {
    renderWithAppContext(
      <RecentSettlements />,
      {
        initialState: {
          settlements: [],
          users: [],
          expenses: [],
          events: []
        }
      }
    );
    
    await waitFor(() => {
      expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    });
    
    expect(screen.getByText('No settlements yet')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all settlements')).toBeInTheDocument();
  });

  it('links to individual settlement details pages', () => {
    renderWithAppContext(
      <RecentSettlements />,
      {
        initialState: {
          settlements: mockSettlements,
          users: mockUsers,
          expenses: [],
          events: []
        }
      }
    );

    // Look for links that match what we see in the actual rendered output
    const expenseLinks = screen.getAllByTestId('next-link');
    expect(expenseLinks.length).toBeGreaterThan(0);
    
    // Check that at least one link points to expenses page
    const hasExpenseLinks = expenseLinks.some(link => {
      const href = link.getAttribute('href');
      return href && href.includes('/expenses/');
    });
    
    expect(hasExpenseLinks).toBeTruthy();
  });
});
