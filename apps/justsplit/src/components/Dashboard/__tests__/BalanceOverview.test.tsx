import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import BalanceOverview from '../BalanceOverview';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode, href: string }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Correct mock path for calculateSettlementsWithConversion
jest.mock('../../../utils/expenseCalculator', () => ({
  ...jest.requireActual('../../../utils/expenseCalculator'),
  calculateSettlementsWithConversion: jest.fn(async (expenses, users) => {
    if (!users || users.length === 0) return [];
    if (users.length === 2 && users[0].name === 'Alice' && users[1].name === 'Bob') {
      return [{ fromUser: 'user2', toUser: 'user1', amount: 25, currency: 'USD' }];
    }
    return [];
  })
}));

describe('BalanceOverview', () => {
  it('renders balance overview correctly with data', async () => {
    const mockExpenses = [
      { 
        id: 'exp1', 
        description: 'Test Expense 1',
        amount: 100, 
        currency: 'USD',
        date: new Date().toISOString(),
        paidBy: 'user1', 
        participants: ['user1', 'user2'], 
        settled: false,
        createdAt: new Date().toISOString()
      },
      { 
        id: 'exp2', 
        description: 'Test Expense 2',
        amount: 50, 
        currency: 'USD',
        date: new Date().toISOString(),
        paidBy: 'user2', 
        participants: ['user1', 'user2'], 
        settled: false,
        createdAt: new Date().toISOString()
      }
    ];
    
    const mockUsers = [
      { id: 'user1', name: 'Alice', balance: 25, friends: ['user2'], preferredCurrency: 'USD' },
      { id: 'user2', name: 'Bob', balance: -25, friends: ['user1'], preferredCurrency: 'USD' }
    ];
    
    renderWithAppContext(
      <BalanceOverview balanceDistribution={{}} preferredCurrency="USD" />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: [],
          settlements: [],
          currentUser: { id: 'user1', name: 'Alice', balance: 25, friends: ['user2'], preferredCurrency: 'USD' }
        }
      }
    );
    
    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByText('Calculating balances...')).not.toBeInTheDocument());
    
    // Check summary section
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    expect(screen.getByText('You are owed:')).toBeInTheDocument();
    expect(screen.getByText('You owe:')).toBeInTheDocument();
    expect(screen.getByText('Net balance:')).toBeInTheDocument();
    
    // // Check individual balances section
    // const userBalancesHeader = screen.getByText('Individual Balances');
    // const userBalancesSection = userBalancesHeader.parentElement?.nextElementSibling;
    // expect(userBalancesSection).toBeInTheDocument();
    
    // // Check Alice and Bob balances in the individual section
    // expect(within(userBalancesSection!).getByText('Alice')).toBeInTheDocument();
    // expect(within(userBalancesSection!).getByText('Bob')).toBeInTheDocument();
    // expect(within(userBalancesSection!).getByText('$25.00')).toBeInTheDocument();
    // expect(within(userBalancesSection!).getByText('-$25.00')).toBeInTheDocument();
  });

  it('handles empty data correctly', () => {
    renderWithAppContext(
      <BalanceOverview balanceDistribution={{}} preferredCurrency="USD" />,
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

  // it('applies correct CSS classes for positive and negative balances', async () => {
  //   const { calculateSettlementsWithConversion } = require('../../../utils/expenseCalculator');
  //   // Alice: +50, Bob: -50, Charlie: 0
  //   calculateSettlementsWithConversion.mockImplementationOnce(async () => [
  //     { fromUser: 'user2', toUser: 'user1', amount: 30, currency: 'USD' }, // Bob pays Alice 30
  //     { fromUser: 'user2', toUser: 'user1', amount: 20, currency: 'USD' }, // Bob pays Alice 20
  //   ]);
  //   const mockUsers = [
  //     { id: 'user1', name: 'Alice', balance: 50 },
  //     { id: 'user2', name: 'Bob', balance: -30 },
  //     { id: 'user3', name: 'Charlie', balance: 0 }
  //   ];
  //   renderWithAppContext(
  //     <BalanceOverview />, {
  //       initialState: {
  //         expenses: [],
  //         users: mockUsers,
  //         events: [],
  //         settlements: []
  //       }
  //     }
  //   );
  //   await waitFor(() => expect(screen.queryByText('Calculating balances...')).not.toBeInTheDocument());
  //   const userBalancesHeader = screen.getByText('Individual Balances');
  //   const userBalancesSection = userBalancesHeader.parentElement?.nextElementSibling;
  //   expect(userBalancesSection).toBeInTheDocument();
  //   const userBalanceDivs = userBalancesSection!.querySelectorAll('div[class*="userBalance"]');
  //   const aliceDiv = Array.from(userBalanceDivs).find(div => within(div).queryByText('Alice'));
  //   const bobDiv = Array.from(userBalanceDivs).find(div => within(div).queryByText('Bob'));
  //   const charlieDiv = Array.from(userBalanceDivs).find(div => within(div).queryByText('Charlie'));
  //   expect(aliceDiv).not.toBeNull();
  //   expect(bobDiv).not.toBeNull();
  //   expect(charlieDiv).not.toBeNull();
  //   expect(within(aliceDiv!).getByText('$50.00')).toBeInTheDocument();
  //   expect(within(bobDiv!).getByText('-$50.00')).toBeInTheDocument(); // updated expectation
  //   expect(within(charlieDiv!).getByText('$0.00')).toBeInTheDocument();
  // });

  test('displays current balance from context', async () => {
    const testState = {
      users: [
        { id: 'user1', name: 'Test User', balance: 150, preferredCurrency: 'USD' },
        { id: 'user2', name: 'Other User', balance: -150, preferredCurrency: 'USD' }
      ],
      expenses: [
        { id: 'exp1', description: 'Test Expense', amount: 150, paidBy: 'user1', participants: ['user1', 'user2'], settled: false, currency: 'USD', date: new Date().toISOString() }
      ],
      events: [],
      settlements: []
    };
    renderWithAppContext(<BalanceOverview balanceDistribution={{}} preferredCurrency="USD" />, { initialState: testState });
    await waitFor(() => expect(screen.queryByText('Calculating balances...')).not.toBeInTheDocument());
    const netBalanceLabel = screen.getByText('Net balance:');
    const netBalanceRow = netBalanceLabel.closest('div');
    const netBalanceAmount = netBalanceRow?.parentElement?.querySelector('[class*="balanceAmount"]');
    expect(netBalanceAmount).not.toBeNull();
    expect(netBalanceAmount).toHaveTextContent('$0.00'); // with currentUser in state, expected to be $0.00
  });

  // test('shows zero balance when user has no balance', async () => {
  //   const testState = {
  //     users: [{ id: 'user1', name: 'Test User', balance: 0, preferredCurrency: 'USD' }],
  //     expenses: [],
  //     events: [],
  //     settlements: []
  //   };
    
  //   renderWithAppContext(<BalanceOverview />, { initialState: testState });
    
  //   await waitFor(() => expect(screen.queryByText('Calculating balances...')).not.toBeInTheDocument());
    
  //   const userBalancesHeader = screen.getByText('Individual Balances');
  //   const userBalancesSection = userBalancesHeader.parentElement?.nextElementSibling;
  //   const userBalanceDivs = userBalancesSection!.querySelectorAll('div[class*="userBalance"]');
  //   const userDiv = Array.from(userBalanceDivs).find(div => within(div).queryByText('Test User'));
    
  //   expect(userDiv).not.toBeNull();
  //   expect(within(userDiv!).getByText('$0.00')).toBeInTheDocument();
  // });
});
