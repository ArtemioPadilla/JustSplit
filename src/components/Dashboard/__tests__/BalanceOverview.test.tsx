import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import BalanceOverview from '../BalanceOverview';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

describe('BalanceOverview', () => {
  it('renders balance overview correctly with data', () => {
    const mockExpenses = [
      { id: 'exp1', amount: 100, paidBy: 'user1', participants: ['user1', 'user2'], settled: false },
      { id: 'exp2', amount: 50, paidBy: 'user2', participants: ['user1', 'user2'], settled: false }
    ];
    
    const mockUsers = [
      { id: 'user1', name: 'Alice', balance: 25 },
      { id: 'user2', name: 'Bob', balance: -25 }
    ];
    
    renderWithAppContext(
      <BalanceOverview />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    
    // Use getAllByText and verify the count instead of ambiguous getByText
    expect(screen.getAllByText('$25.00')).toHaveLength(2);
    expect(screen.getAllByText('-$25.00')).toHaveLength(2);
    
    // Check for specific user names to verify the user balances section
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('handles empty data correctly', () => {
    renderWithAppContext(
      <BalanceOverview />,
      {
        initialState: {
          expenses: [],
          users: [],
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    expect(screen.getByText('No balance data available')).toBeInTheDocument();
  });

  it('applies correct CSS classes for positive and negative balances', () => {
    const mockUsers = [
      { id: 'user1', name: 'Alice', balance: 50 },
      { id: 'user2', name: 'Bob', balance: -30 },
      { id: 'user3', name: 'Charlie', balance: 0 }
    ];
    
    renderWithAppContext(
      <BalanceOverview />,
      {
        initialState: {
          expenses: [],
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    // Find elements by their relation to user names, which are unique
    const aliceBalanceParent = screen.getByText('Alice').closest('.userBalance');
    const bobBalanceParent = screen.getByText('Bob').closest('.userBalance');
    const charlieBalanceParent = screen.getByText('Charlie').closest('.userBalance');
    
    // Now find the balance elements within these parent elements
    const aliceBalanceElement = aliceBalanceParent?.querySelector('div:not(.userName)');
    const bobBalanceElement = bobBalanceParent?.querySelector('div:not(.userName)');
    const charlieBalanceElement = charlieBalanceParent?.querySelector('div:not(.userName)');
    
    // Check classes
    expect(aliceBalanceElement).toHaveClass('positiveBalance');
    expect(bobBalanceElement).toHaveClass('negativeBalance');
    expect(charlieBalanceElement).toHaveClass('zeroBalance');
  });

  test('displays current balance from context', () => {
    const testState = {
      users: [{ id: 'user1', name: 'Test User', balance: 150, preferredCurrency: 'USD' }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<BalanceOverview />, { initialState: testState });
    
    // Find specifically the net balance row
    const netBalanceLabel = screen.getByText('Net balance:');
    const netBalanceRow = netBalanceLabel.closest('.balanceRow');
    const netBalanceAmount = netBalanceRow?.querySelector('.balanceAmount');
    
    expect(netBalanceAmount).toHaveTextContent('$150.00');
    expect(netBalanceAmount).toHaveClass('positiveBalance');
  });
  
  test('shows zero balance when user has no balance', () => {
    const testState = {
      users: [{ id: 'user1', name: 'Test User', balance: 0, preferredCurrency: 'USD' }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<BalanceOverview />, { initialState: testState });
    
    // Find specifically the user's balance in the user list
    const userNameElement = screen.getByText('Test User');
    const userBalanceContainer = userNameElement.closest('.userBalance');
    const userBalanceElement = userBalanceContainer?.querySelector('div:not(.userName)');
    
    expect(userBalanceElement).toHaveTextContent('$0.00');
    expect(userBalanceElement).toHaveClass('zeroBalance');
  });
});
