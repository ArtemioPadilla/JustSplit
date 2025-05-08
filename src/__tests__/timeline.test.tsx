import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Mock data
const mockEvent = {
  id: 'event1',
  name: 'Test Event',
  startDate: '2023-06-01',
  endDate: '2023-06-10',
  participants: ['user1', 'user2']
};

const mockExpenses = [
  {
    id: 'exp1',
    eventId: 'event1',
    amount: 100,
    currency: 'USD',
    settled: true,
    date: '2023-05-20', // Pre-event
    description: 'Pre-event expense'
  },
  {
    id: 'exp2',
    eventId: 'event1',
    amount: 50,
    currency: 'USD',
    settled: false,
    date: '2023-06-01', // Start date
    description: 'Start date expense'
  },
  {
    id: 'exp3',
    eventId: 'event1',
    amount: 200,
    currency: 'USD',
    settled: true,
    date: '2023-06-05', // Mid-event
    description: 'Mid-event expense'
  },
  {
    id: 'exp4',
    eventId: 'event1',
    amount: 75,
    currency: 'EUR',
    settled: false,
    date: '2023-06-05T12:00:00', // Same day as exp3
    description: 'Same day expense'
  },
  {
    id: 'exp5',
    eventId: 'event1',
    amount: 25,
    currency: 'USD',
    settled: false,
    date: '2023-06-10', // End date
    description: 'End date expense'
  }
];

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock the AppContext
jest.mock('../../../context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    state: {
      events: [mockEvent],
      expenses: mockExpenses,
      users: [
        { id: 'user1', name: 'User 1' },
        { id: 'user2', name: 'User 2' }
      ]
    }
  })),
  User: {}
}));

// Import the functions to test - extract these from the component for testing
const calculatePositionPercentage = (date: string, startDate: string, endDate?: string): number => {
  const targetDate = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : new Date().getTime();
  
  // Calculate the total event duration
  const totalDuration = end - start;
  
  // For pre-event expenses (before start date)
  if (targetDate < start) {
    // Allocate 20% of the timeline for pre-event expenses
    // Find how far back this expense is - up to 30 days before
    const daysBeforeEvent = (start - targetDate) / (1000 * 60 * 60 * 24);
    const maxDaysToShow = 30; // Show up to 30 days before
    const preEventPosition = 20 * Math.min(daysBeforeEvent, maxDaysToShow) / maxDaysToShow;
    return -Math.min(20, preEventPosition); // Cap at -20%
  }
  
  // For expenses exactly on the start date - shift slightly to avoid dot overlap
  if (Math.abs(targetDate - start) < 1000 * 60 * 60) { // Within an hour of start
    return 1; // Position at 1% to avoid overlapping the start dot but still be visible
  }
  
  // For expenses exactly on the end date - shift slightly to avoid dot overlap
  if (endDate && Math.abs(targetDate - end) < 1000 * 60 * 60) { // Within an hour of end
    return 99; // Position at 99% to avoid overlapping the end dot but still be visible
  }
  
  // For expenses within the event period
  if (targetDate >= start && (!endDate || targetDate <= end)) {
    return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
  }
  
  // For expenses after the event end date (if there's no end date specified)
  return 100;
};

type Expense = {
  id: string;
  eventId: string;
  amount: number;
  currency: string;
  settled?: boolean;
  date: string;
  description?: string;
};

type Event = {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  participants: string[];
};

const groupNearbyExpenses = (expenses: Expense[], event: Event): { position: number, expenses: Expense[] }[] => {
  // Calculate positions for all expenses
  const expensesWithPositions = expenses.map(expense => ({
    expense,
    position: calculatePositionPercentage(expense.date, event.startDate, event.endDate)
  }));

  // Group expenses that are within 5% of each other
  const proximityThreshold = 5;
  const groupedExpenses: { position: number, expenses: Expense[] }[] = [];
  
  for (const { expense, position } of expensesWithPositions) {
    // Find if there's an existing group close to this position
    const existingGroup = groupedExpenses.find(
      group => Math.abs(group.position - position) < proximityThreshold
    );
    
    if (existingGroup) {
      // Add to existing group and adjust average position
      existingGroup.expenses.push(expense);
      // Recalculate the average position for the group
      existingGroup.position = existingGroup.expenses.reduce(
        (sum, exp) => sum + calculatePositionPercentage(exp.date, event.startDate, event.endDate),
        0
      ) / existingGroup.expenses.length;
    } else {
      // Create a new group
      groupedExpenses.push({ position, expenses: [expense] });
    }
  }
  
  return groupedExpenses;
};

describe('Timeline Position Calculation', () => {
  test('calculates position for pre-event expenses correctly', () => {
    const position = calculatePositionPercentage('2023-05-20', '2023-06-01', '2023-06-10');
    expect(position).toBeLessThan(0);
    expect(Math.abs(position)).toBeLessThanOrEqual(20);
  });

  test('positions expenses on start date at 1%', () => {
    const position = calculatePositionPercentage('2023-06-01', '2023-06-01', '2023-06-10');
    expect(position).toBe(1);
  });

  test('positions expenses on end date at 99%', () => {
    const position = calculatePositionPercentage('2023-06-10', '2023-06-01', '2023-06-10');
    expect(position).toBe(99);
  });

  test('positions mid-event expenses proportionally', () => {
    // Event is 10 days, this is day 5, should be around 50%
    const position = calculatePositionPercentage('2023-06-05', '2023-06-01', '2023-06-10');
    expect(position).toBeGreaterThanOrEqual(40);
    expect(position).toBeLessThanOrEqual(60);
  });

  test('caps position at 100% for post-event expenses', () => {
    const position = calculatePositionPercentage('2023-06-15', '2023-06-01', '2023-06-10');
    expect(position).toBe(100);
  });
});

describe('Expense Grouping', () => {
  test('groups nearby expenses correctly', () => {
    const grouped = groupNearbyExpenses([mockExpenses[2], mockExpenses[3]], mockEvent);
    expect(grouped.length).toBe(1); // Should combine into one group
    expect(grouped[0].expenses.length).toBe(2);
  });

  test('keeps distant expenses separate', () => {
    const grouped = groupNearbyExpenses([mockExpenses[0], mockExpenses[4]], mockEvent);
    expect(grouped.length).toBe(2); // Should be separate groups
  });

  test('calculates average position for groups', () => {
    const grouped = groupNearbyExpenses([mockExpenses[2], mockExpenses[3]], mockEvent);
    
    // Both expenses are on June 5, which is midway through the event
    // So the average position should be around 50%
    expect(grouped[0].position).toBeGreaterThanOrEqual(40);
    expect(grouped[0].position).toBeLessThanOrEqual(60);
  });

  test('handles all expenses in the event', () => {
    const grouped = groupNearbyExpenses(mockExpenses, mockEvent);
    
    // Expected groups:
    // 1. Pre-event (exp1)
    // 2. Start date (exp2)
    // 3. Mid-event (exp3 and exp4 together)
    // 4. End date (exp5)
    expect(grouped.length).toBe(4);
    
    // The mid-event group should have 2 expenses
    const midEventGroup = grouped.find(g => 
      g.expenses.some(e => e.id === 'exp3') && 
      g.expenses.some(e => e.id === 'exp4')
    );
    
    expect(midEventGroup).toBeDefined();
    expect(midEventGroup?.expenses.length).toBe(2);
  });
});

// Integration tests would test the component rendering and interactions
// However, since the component is complex with many dependencies,
// here's a sketch of how the tests would look:

/*
describe('Timeline Component', () => {
  test('renders timeline with correct expense markers', async () => {
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    
    render(<EventList />);
    
    // Check that timeline is rendered
    expect(screen.getByText('Your Events')).toBeInTheDocument();
    
    // Check that expense markers are rendered
    const markers = screen.getAllByRole('button', { name: /expense/i });
    expect(markers.length).toBeGreaterThanOrEqual(3); // At least start, mid, and end markers
  });
  
  test('shows hover card when clicking on expense marker', async () => {
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
    
    render(<EventList />);
    
    // Find a marker and click it
    const marker = screen.getAllByRole('button', { name: /expense/i })[0];
    fireEvent.click(marker);
    
    // Check that hover card appears
    await waitFor(() => {
      expect(screen.getByText(/expense details/i)).toBeInTheDocument();
    });
  });
});
*/
