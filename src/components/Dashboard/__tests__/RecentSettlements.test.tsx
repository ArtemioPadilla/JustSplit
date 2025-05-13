import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import RecentSettlements from '../RecentSettlements';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

// Mock currency conversion functions
jest.mock('../../../utils/currencyExchange', () => ({
  formatCurrency: (amount, currency) => `$${amount.toFixed(2)}`,
  convertCurrency: async () => ({ convertedAmount: 100, isFallback: false }),
  getCurrencySymbol: () => '$'
}));

describe('RecentSettlements', () => {
  // Update mock data to match the expected structure more precisely
  const mockSettlements = [
    { 
      id: 'settlement1', 
      amount: 50.00, 
      currency: 'USD',
      date: '2023-05-13', 
      fromUser: 'user1',
      toUser: 'user2',
      status: 'completed',
      expenseIds: []
    },
    { 
      id: 'settlement2', 
      amount: 35.00, 
      currency: 'USD',
      date: '2023-05-06', 
      fromUser: 'user2',
      toUser: 'user3',
      status: 'completed',
      expenseIds: []
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 }
  ];

  it('renders recent settlements correctly with data', async () => {
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
    
    // Check title is present
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    
    // Wait for any async operations to complete
    await waitFor(() => {
      // Check if amounts are displayed with currency symbol
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
    
    expect(screen.getByText('$35.00')).toBeInTheDocument();
    
    // Check for user names individually as they are separated in the DOM
    const aliceElements = screen.getAllByText('Alice');
    expect(aliceElements.length).toBeGreaterThan(0);
    
    const bobElements = screen.getAllByText('Bob');
    expect(bobElements.length).toBeGreaterThan(0);
    
    const charlieElements = screen.getAllByText('Charlie');
    expect(charlieElements.length).toBeGreaterThan(0);
    
    // Check that date elements exist by using a regex pattern to match date format
    const dateElements = screen.getAllByText(/^\d+\/\d+\/\d+$/);
    expect(dateElements.length).toBe(2);
    
    // Status indicators
    const completedElements = screen.getAllByText('Completed');
    expect(completedElements.length).toBe(2);
    
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
          users: mockUsers,
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

  it('links to individual settlement details pages', async () => {
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
    
    await waitFor(() => {
      const links = screen.getAllByTestId('next-link');
      // Filter links to settlement detail pages
      const settlementLinks = links.filter(link => {
        const href = link.getAttribute('href');
        return href && href.includes('settlements/settlement');
      });
      expect(settlementLinks.length).toBeGreaterThan(0);
    });
  });
});
