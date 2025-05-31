import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

interface MockEvent {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
}

interface MockExpense {
  id: string;
  eventId: string;
  amount: number;
  currency: string;
  settled: boolean;
  date: string;
  description: string;
}

// Simple Timeline component for testing event handlers
const Timeline = ({
  event,
  expenses,
  onExpenseClick
}: {
  event: MockEvent,
  expenses: MockExpense[],
  onExpenseClick: (e: React.MouseEvent, expenses: MockExpense[]) => void
}) => {
  // Group expenses by date (simplified version of groupNearbyExpenses)
  const groupedExpenses: Record<string, MockExpense[]> = {};
  
  expenses.forEach(expense => {
    const dateKey = expense.date.split('T')[0]; // Just use the date part
    if (!groupedExpenses[dateKey]) {
      groupedExpenses[dateKey] = [];
    }
    groupedExpenses[dateKey].push(expense);
  });
  
  return (
    <div data-testid="timeline" className="timeline">
      <div className="timeline-progress" style={{ width: '50%' }}></div>
      <div className="timeline-dot" style={{ left: '0%' }} title={`Event Start: ${event.startDate}`}></div>
      <div className="timeline-dot" style={{ left: '100%' }} title={`Event End: ${event.endDate}`}></div>
      
      {/* Expense markers */}
      {Object.entries(groupedExpenses).map(([date, exps], index) => {
        // Simplified position calculation
        const position = date === event.startDate ? 0 : 
                         date === event.endDate ? 100 : 50;
                         
        return (
          <div
            key={`group-${index}`}
            data-testid={`expense-marker-${date}`}
            className="expense-marker"
            style={{ left: `${position}%` }}
            title={exps.length === 1 ? 
              `${exps[0].description}: ${exps[0].amount} ${exps[0].currency}` : 
              `${exps.length} expenses on ${date}`}
            onClick={(e) => onExpenseClick(e, exps)}
          ></div>
        );
      })}
    </div>
  );
};

describe('Timeline Events', () => {
  const mockEvent = {
    id: 'event1',
    name: 'Test Event',
    startDate: '2023-06-01',
    endDate: '2023-06-10'
  };
  
  const mockExpenses = [
    {
      id: 'exp1',
      eventId: 'event1',
      amount: 100,
      currency: 'USD',
      settled: true,
      date: '2023-06-01',
      description: 'Start date expense'
    },
    {
      id: 'exp2',
      eventId: 'event1',
      amount: 50,
      currency: 'USD',
      settled: false,
      date: '2023-06-05',
      description: 'Mid-event expense'
    }
  ];

  test('renders expense markers for all expense dates', () => {
    const handleExpenseClick = jest.fn();
    
    render(
      <Timeline 
        event={mockEvent}
        expenses={mockExpenses}
        onExpenseClick={handleExpenseClick}
      />
    );
    
    // Should have markers for both expense dates
    expect(screen.getByTestId('expense-marker-2023-06-01')).toBeInTheDocument();
    expect(screen.getByTestId('expense-marker-2023-06-05')).toBeInTheDocument();
  });
  
  test('calls click handler with correct expenses when marker is clicked', () => {
    const handleExpenseClick = jest.fn();
    
    render(
      <Timeline 
        event={mockEvent}
        expenses={mockExpenses}
        onExpenseClick={handleExpenseClick}
      />
    );
    
    // Click on first expense marker
    fireEvent.click(screen.getByTestId('expense-marker-2023-06-01'));
    
    // Should call handler with the expenses for that date
    expect(handleExpenseClick).toHaveBeenCalledTimes(1);
    expect(handleExpenseClick.mock.calls[0][1]).toEqual([mockExpenses[0]]);
    
    // Click on second expense marker
    fireEvent.click(screen.getByTestId('expense-marker-2023-06-05'));
    
    // Should call handler with the expenses for that date
    expect(handleExpenseClick).toHaveBeenCalledTimes(2);
    expect(handleExpenseClick.mock.calls[1][1]).toEqual([mockExpenses[1]]);
  });
  
  test('shows tooltip with expense details on hover', async () => {
    const handleExpenseClick = jest.fn();
    
    render(
      <Timeline 
        event={mockEvent}
        expenses={mockExpenses}
        onExpenseClick={handleExpenseClick}
      />
    );
    
    // Check tooltip content
    expect(screen.getByTestId('expense-marker-2023-06-01')).toHaveAttribute(
      'title',
      'Start date expense: 100 USD'
    );
    
    expect(screen.getByTestId('expense-marker-2023-06-05')).toHaveAttribute(
      'title',
      'Mid-event expense: 50 USD'
    );
  });
  
  test('shows grouped expenses tooltip for multiple expenses on same date', () => {
    const handleExpenseClick = jest.fn();
    const multiDayExpenses = [
      ...mockExpenses,
      {
        id: 'exp3',
        eventId: 'event1',
        amount: 75,
        currency: 'EUR',
        settled: false,
        date: '2023-06-05T12:00:00', // Same day as exp2
        description: 'Another mid-event expense'
      }
    ];
    
    render(
      <Timeline 
        event={mockEvent}
        expenses={multiDayExpenses}
        onExpenseClick={handleExpenseClick}
      />
    );
    
    // Should show "2 expenses" in tooltip for the date with multiple expenses
    expect(screen.getByTestId('expense-marker-2023-06-05')).toHaveAttribute(
      'title',
      '2 expenses on 2023-06-05'
    );
  });
});
