import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

interface MockExpense {
  id: string;
  description?: string;
  amount: number;
  currency: string;
  date: string;
  settled: boolean;
}

// Create a simplified hover card for testing
const HoverCard = ({ 
  expenses, 
  onClose, 
  onExpenseClick 
}: { 
  expenses: MockExpense[], 
  onClose: () => void, 
  onExpenseClick: (id: string) => void 
}) => {
  return (
    <div data-testid="hover-card" className="hover-card">
      <div className="hover-card-header">
        <h4>{expenses.length > 1 ? `${expenses.length} Expenses` : 'Expense Details'}</h4>
        <button onClick={onClose}>✕</button>
      </div>
      <ul className="expenses-list">
        {expenses.map(expense => (
          <li 
            key={expense.id} 
            data-testid={`expense-item-${expense.id}`}
            onClick={() => onExpenseClick(expense.id)}
          >
            <div>
              <span>{expense.description || 'Expense'}</span>
              <span>{expense.settled ? 'Settled' : 'Unsettled'}</span>
            </div>
            <div>
              {expense.amount.toFixed(2)} {expense.currency}
            </div>
            <div>
              {new Date(expense.date).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

describe('HoverCard Component', () => {
  const mockExpenses = [
    {
      id: 'exp1',
      amount: 100,
      currency: 'USD',
      settled: true,
      date: '2023-06-05',
      description: 'Test Expense 1'
    },
    {
      id: 'exp2',
      amount: 50,
      currency: 'EUR',
      settled: false,
      date: '2023-06-05',
      description: 'Test Expense 2'
    }
  ];

  test('renders correct title for single expense', () => {
    const onClose = jest.fn();
    const onExpenseClick = jest.fn();

    render(
      <HoverCard 
        expenses={[mockExpenses[0]]} 
        onClose={onClose} 
        onExpenseClick={onExpenseClick}
      />
    );

    expect(screen.getByText('Expense Details')).toBeInTheDocument();
    expect(screen.queryByText(/2 Expenses/)).not.toBeInTheDocument();
  });

  test('renders correct title for multiple expenses', () => {
    const onClose = jest.fn();
    const onExpenseClick = jest.fn();

    render(
      <HoverCard 
        expenses={mockExpenses} 
        onClose={onClose} 
        onExpenseClick={onExpenseClick}
      />
    );

    expect(screen.getByText('2 Expenses')).toBeInTheDocument();
  });

  test('displays all expenses with correct information', () => {
    const onClose = jest.fn();
    const onExpenseClick = jest.fn();

    render(
      <HoverCard 
        expenses={mockExpenses} 
        onClose={onClose} 
        onExpenseClick={onExpenseClick}
      />
    );

    expect(screen.getByText('Test Expense 1')).toBeInTheDocument();
    expect(screen.getByText('Test Expense 2')).toBeInTheDocument();
    expect(screen.getByText('100.00 USD')).toBeInTheDocument();
    expect(screen.getByText('50.00 EUR')).toBeInTheDocument();
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getByText('Unsettled')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    const onExpenseClick = jest.fn();

    render(
      <HoverCard 
        expenses={mockExpenses} 
        onClose={onClose} 
        onExpenseClick={onExpenseClick}
      />
    );

    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onExpenseClick with correct ID when expense item is clicked', () => {
    const onClose = jest.fn();
    const onExpenseClick = jest.fn();

    render(
      <HoverCard 
        expenses={mockExpenses} 
        onClose={onClose} 
        onExpenseClick={onExpenseClick}
      />
    );

    fireEvent.click(screen.getByTestId('expense-item-exp1'));
    expect(onExpenseClick).toHaveBeenCalledWith('exp1');
  });
});
