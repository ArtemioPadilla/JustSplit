import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import RecentSettlements from '../RecentSettlements';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

describe('RecentSettlements', () => {
  const mockSettlements = [
    { 
      id: 'settlement1', 
      amount: 50.00, 
      currency: 'USD',
      date: '2023-05-15', 
      fromUserId: 'user1',
      toUserId: 'user2',
      status: 'pending'
    },
    { 
      id: 'settlement2', 
      amount: 35.00, 
      currency: 'USD',
      date: '2023-05-08', 
      fromUserId: 'user2',
      toUserId: 'user3',
      status: 'completed'
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 }
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
    
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    
    // Check if amounts are displayed with currency symbol
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('$35.00')).toBeInTheDocument();
    
    // Check for specific settlement texts instead of individual names
    expect(screen.getByText('Alice → Bob')).toBeInTheDocument();
    expect(screen.getByText('Bob → Charlie')).toBeInTheDocument();
    
    // Status indicators
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    
    // Check if "View all settlements" link is displayed
    const viewAllLink = screen.getByText('View all settlements');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/settlements');
  });

  it('handles empty data correctly', () => {
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
    
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
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
    
    const links = screen.getAllByTestId('next-link');
    // Check if there's a link to the individual settlement page
    const settlementLinks = links.filter(link => link.getAttribute('href').startsWith('/settlements/'));
    expect(settlementLinks.length).toBeGreaterThan(0);
  });
});
