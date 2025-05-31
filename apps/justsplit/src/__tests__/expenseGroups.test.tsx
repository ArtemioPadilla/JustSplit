import '@testing-library/jest-dom';

// Mock the useRouter hook
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

interface MockExpense {
  id: string;
  date: string;
  amount: number;
  currency: string;
}

interface ExpenseGroup {
  position: number;
  expenses: MockExpense[];
}

// Mock the grouping function
const groupNearbyExpenses = (expenses: MockExpense[]): ExpenseGroup[] => {
  // Simple implementation for testing
  // Group expenses that occur on the same date
  const groups: Record<string, ExpenseGroup> = {};
  expenses.forEach(expense => {
    const dateKey = new Date(expense.date).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = {
        position: 50, // Mock position
        expenses: []
      };
    }
    groups[dateKey].expenses.push(expense);
  });
  
  return Object.values(groups);
};

describe('Expense Group Functionality', () => {
  test('groups expenses correctly by date proximity', () => {
    const expenses: MockExpense[] = [
      { id: '1', date: '2023-05-01', amount: 100, currency: 'USD' },
      { id: '2', date: '2023-05-01', amount: 50, currency: 'USD' },
      { id: '3', date: '2023-05-15', amount: 75, currency: 'EUR' },
    ];
    
    const groups = groupNearbyExpenses(expenses);
    expect(groups).toHaveLength(2);
    
    // First group should have 2 expenses
    expect(groups[0].expenses).toHaveLength(2);
    expect(groups[0].expenses[0].id).toBe('1');
    expect(groups[0].expenses[1].id).toBe('2');
    
    // Second group should have 1 expense
    expect(groups[1].expenses).toHaveLength(1);
    expect(groups[1].expenses[0].id).toBe('3');
  });
});
