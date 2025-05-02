import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import FinancialSummary from '../FinancialSummary';

describe('FinancialSummary', () => {
  it('renders financial summary with data correctly', () => {
    const mockExpenses = [
      { id: 'exp1', amount: 100, date: '2023-06-15', description: 'Groceries', category: 'Food' },
      { id: 'exp2', amount: 50, date: '2023-06-20', description: 'Gas', category: 'Transportation' },
      { id: 'exp3', amount: 30, date: '2023-07-01', description: 'Coffee', category: 'Food' }
    ];

    renderWithAppContext(
      <FinancialSummary />,
      {
        initialState: {
          expenses: mockExpenses,
          users: [],
          events: [],
          settlements: []
        }
      }
    );
    
    // Check for component title
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    
    // Check for total expenses
    const totalExpenses = screen.getByTestId('total-expenses');
    expect(totalExpenses).toHaveTextContent('$180.00');
    
    // Check for category breakdowns (using getAllByText since there might be multiple elements)
    expect(screen.getAllByText('Food').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Transportation').length).toBeGreaterThan(0);
    
    // Check for category amounts
    const foodAmount = screen.getByTestId('category-Food-amount');
    const transportationAmount = screen.getByTestId('category-Transportation-amount');
    expect(foodAmount).toHaveTextContent('$130.00');
    expect(transportationAmount).toHaveTextContent('$50.00');
  });

  it('renders message when no expense data is available', () => {
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
    expect(screen.getByText('No expense data available')).toBeInTheDocument();
    
    // Check for zero total amount
    const totalExpenses = screen.getByTestId('total-expenses');
    expect(totalExpenses).toHaveTextContent('$0.00');
  });
});
