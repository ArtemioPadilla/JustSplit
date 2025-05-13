import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import FinancialSummary from '../FinancialSummary';

// Mock currency conversion functions to resolve immediately
jest.mock('../../../utils/currencyExchange', () => ({
  convertCurrency: async () => ({ convertedAmount: 100, isFallback: false }),
  formatCurrency: (amount) => `$${amount.toFixed(2)}`,
}));

describe('FinancialSummary', () => {
  it('renders financial summary with data correctly', async () => {
    const mockExpenses = [
      { 
        id: 'exp1', 
        amount: 100, 
        currency: 'USD',
        date: '2023-06-15', 
        description: 'Groceries', 
        category: 'Food',
        paidBy: 'user1',
        participants: ['user1', 'user2']
      },
      { 
        id: 'exp2', 
        amount: 50, 
        currency: 'USD',
        date: '2023-06-20', 
        description: 'Gas', 
        category: 'Transportation',
        paidBy: 'user2',
        participants: ['user1', 'user2']
      },
      { 
        id: 'exp3', 
        amount: 30, 
        currency: 'USD',
        date: '2023-07-01', 
        description: 'Coffee', 
        category: 'Food',
        paidBy: 'user1',
        participants: ['user1']
      }
    ];

    const mockUsers = [
      { id: 'user1', name: 'Alice', balance: 0 },
      { id: 'user2', name: 'Bob', balance: 0 }
    ];

    renderWithAppContext(
      <FinancialSummary />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: [],
          settlements: []
        }
      }
    );
    
    // Check for component title
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    // Check for KPI sections using getAllByText for KPI labels
    const kpiLabels = screen.getAllByText(/Total Expenses|Avg\. Expense|Total Events|Total Settlements|Most Frequent Category/i);
    expect(kpiLabels.length).toBeGreaterThan(3); // Should have multiple KPIs

    // Check the total expenses value
    const totalExpensesElement = screen.getByText('Total Expenses').closest('.kpiBox');
    expect(within(totalExpensesElement).getByText('$180.00')).toBeInTheDocument();
    
    // Check for category breakdown heading
    const categoryBreakdownHeading = screen.getByText('Category Breakdown');
    expect(categoryBreakdownHeading).toBeInTheDocument();
    
    // Check for category breakdown items using data-testid attributes
    expect(screen.getByTestId('category-Food-amount')).toBeInTheDocument();
    expect(screen.getByTestId('category-Transportation-amount')).toBeInTheDocument();
    
    // Verify the category amounts
    expect(screen.getByTestId('category-Food-amount').textContent).toBe('$130.00');
    expect(screen.getByTestId('category-Transportation-amount').textContent).toBe('$50.00');

    // Check for most frequent payer - we can use precise selection
    const mostFrequentPayerBox = screen.getByText('Most Frequent Payer').closest('.kpiBox');
    expect(within(mostFrequentPayerBox).getByText('Alice')).toBeInTheDocument();
  });

  it('renders message when no expense data is available', async () => {
    renderWithAppContext(
      <FinancialSummary />,
      {
        initialState: {
          expenses: [],
          users: [],
          events: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    // Check for zero values in KPIs
    expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0);
    
    // Check for no expense data message in category breakdown
    expect(screen.getByText('No expense data available')).toBeInTheDocument();
  });
  
  it('displays various financial KPIs', async () => {
    const mockExpenses = [
      { 
        id: 'exp1', 
        amount: 100, 
        currency: 'USD',
        date: '2023-06-15', 
        description: 'Groceries', 
        category: 'Food',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        eventId: 'event1'
      }
    ];
    
    const mockUsers = [
      { id: 'user1', name: 'Alice', balance: 0 },
      { id: 'user2', name: 'Bob', balance: 0 }
    ];
    
    const mockEvents = [
      { id: 'event1', name: 'Birthday Party', date: '2023-06-15' }
    ];
    
    const mockSettlements = [
      { id: 'settle1', amount: 50, status: 'completed', date: '2023-06-20' }
    ];

    renderWithAppContext(
      <FinancialSummary />,
      {
        initialState: {
          expenses: mockExpenses,
          users: mockUsers,
          events: mockEvents,
          settlements: mockSettlements
        }
      }
    );
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Converting currencies...')).not.toBeInTheDocument();
    });
    
    // Check for event related KPIs
    expect(screen.getByText('Total Events')).toBeInTheDocument();
    expect(screen.getByText('Event with Most Expenses')).toBeInTheDocument();
    expect(screen.getByText('Birthday Party')).toBeInTheDocument();
    
    // Check for settlement related KPIs
    expect(screen.getByText('Total Settlements')).toBeInTheDocument();
    expect(screen.getByText('Avg. Settlement')).toBeInTheDocument();
    
    // Check for participant related KPIs
    expect(screen.getByText('Total Participants')).toBeInTheDocument();
    expect(screen.getByText('Expense per Participant')).toBeInTheDocument();
  });
});
