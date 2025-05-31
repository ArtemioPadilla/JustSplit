import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import UserSummary from '../UserSummary';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
  LinkComponent.displayName = 'Link';
  return LinkComponent;
});

describe('UserSummary', () => {
  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 100.50, preferredCurrency: 'USD' },
    { id: 'user2', name: 'Bob', balance: -50.75, preferredCurrency: 'USD' },
    { id: 'user3', name: 'Charlie', balance: 0, preferredCurrency: 'USD' }
  ];

  it('renders user summary correctly with positive and negative balances', () => {
    renderWithAppContext(
      <UserSummary />,
      {
        initialState: {
          users: mockUsers,
          expenses: [],
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Balance Summary')).toBeInTheDocument();
    
    // Check for user names
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    
    // Check for balance amounts with correct formatting
    expect(screen.getByText('$100.50')).toBeInTheDocument();
    expect(screen.getByText('-$50.75')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    
    // Check for class-based styling based on balance
    const positiveBalance = screen.getByText('$100.50');
    const negativeBalance = screen.getByText('-$50.75');
    const zeroBalance = screen.getByText('$0.00');
    
    expect(positiveBalance.closest('div')).toHaveClass('positiveBalance');
    expect(negativeBalance.closest('div')).toHaveClass('negativeBalance');
    expect(zeroBalance.closest('div')).toHaveClass('zeroBalance');
  });

  it('handles empty users array correctly', () => {
    renderWithAppContext(
      <UserSummary />,
      {
        initialState: {
          users: [],
          expenses: [],
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Balance Summary')).toBeInTheDocument();
    expect(screen.getByText('No users available')).toBeInTheDocument();
  });

  it('contains link to settlements page', () => {
    renderWithAppContext(
      <UserSummary />,
      {
        initialState: {
          users: mockUsers,
          expenses: [],
          events: [],
          settlements: []
        }
      }
    );
    
    const settleUpLink = screen.getByText('Settle Up');
    expect(settleUpLink).toBeInTheDocument();
    expect(settleUpLink.closest('a')).toHaveAttribute('href', '/settlements/new');
  });
});
