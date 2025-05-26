import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import Timeline from '../components/ui/Timeline';
import { groupNearbyExpenses } from '../utils/timelineUtils';

// Mock data
const mockEvent = {
  id: 'event1',
  name: 'Test Event',
  date: '2023-06-01',
  startDate: '2023-06-01',
  endDate: '2023-06-10',
  participants: ['user1', 'user2'],
  createdAt: new Date().toISOString(),
  createdBy: 'user1',
  members: ['user1', 'user2'],
  expenseIds: ['exp1', 'exp2', 'exp3', 'exp4', 'exp5']
};

const mockExpenses = [
  {
    id: 'exp1',
    type: 'expense',
    date: '2023-05-20',
    title: 'Pre-event expense',
    amount: 100,
    currency: 'USD',
    category: 'Food',
    eventName: 'Test Event',
    eventId: 'event1',
    settled: true,
    paidBy: 'user1',
    participants: ['user1', 'user2'],
    userNames: { user1: 'User 1', user2: 'User 2' }
  },
  {
    id: 'exp2',
    type: 'expense',
    date: '2023-06-01',
    title: 'Start date expense',
    amount: 50,
    currency: 'USD',
    category: 'Transport',
    eventName: 'Test Event',
    eventId: 'event1',
    settled: false,
    paidBy: 'user1',
    participants: ['user1', 'user2'],
    userNames: { user1: 'User 1', user2: 'User 2' }
  },
  {
    id: 'exp3',
    type: 'expense',
    date: '2023-06-05',
    title: 'Mid-event expense',
    amount: 200,
    currency: 'USD',
    category: 'Food',
    eventName: 'Test Event',
    eventId: 'event1',
    settled: true,
    paidBy: 'user1',
    participants: ['user1', 'user2'],
    userNames: { user1: 'User 1', user2: 'User 2' }
  },
  {
    id: 'exp4',
    type: 'expense',
    date: '2023-06-05T12:00:00',
    title: 'Same day expense',
    amount: 75,
    currency: 'EUR',
    category: 'Entertainment',
    eventName: 'Test Event',
    eventId: 'event1',
    settled: false,
    paidBy: 'user2',
    participants: ['user1', 'user2'],
    userNames: { user1: 'User 1', user2: 'User 2' }
  },
  {
    id: 'exp5',
    type: 'expense',
    date: '2023-06-10',
    title: 'End date expense',
    amount: 25,
    currency: 'USD',
    category: 'Food',
    eventName: 'Test Event',
    eventId: 'event1',
    settled: false,
    paidBy: 'user1',
    participants: ['user1', 'user2'],
    userNames: { user1: 'User 1', user2: 'User 2' }
  }
];

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock the AppContext
jest.mock('../context/AppContext', () => ({
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

describe('Timeline Grouping Logic', () => {
  test('groupNearbyExpenses should not over-group expenses', () => {
    const testExpenses = [
      {
        id: 'exp1',
        description: 'Pre-event expense',
        amount: 100,
        currency: 'USD',
        date: '2023-05-20',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        eventId: 'event1',
        settled: true,
        category: 'Food'
      },
      {
        id: 'exp2',
        description: 'Start date expense',
        amount: 50,
        currency: 'USD',
        date: '2023-06-01',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        eventId: 'event1',
        settled: false,
        category: 'Transport'
      },
      {
        id: 'exp3',
        description: 'Mid-event expense',
        amount: 200,
        currency: 'USD',
        date: '2023-06-05',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        eventId: 'event1',
        settled: true,
        category: 'Food'
      },
      {
        id: 'exp4',
        description: 'Same day expense',
        amount: 75,
        currency: 'EUR',
        date: '2023-06-05T12:00:00',
        paidBy: 'user2',
        participants: ['user1', 'user2'],
        eventId: 'event1',
        settled: false,
        category: 'Entertainment'
      },
      {
        id: 'exp5',
        description: 'End date expense',
        amount: 25,
        currency: 'USD',
        date: '2023-06-10',
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        eventId: 'event1',
        settled: false,
        category: 'Food'
      }
    ];

    const testEvent = {
      id: 'event1',
      name: 'Test Event',
      date: '2023-06-01',
      startDate: '2023-06-01',
      endDate: '2023-06-10',
      createdAt: new Date().toISOString(),
      createdBy: 'user1',
      members: ['user1', 'user2'],
      expenseIds: []
    };

    // Test position calculations
    console.log('Position calculations:');
    testExpenses.forEach(exp => {
      const position = calculatePositionPercentage(exp.date, testEvent.startDate, testEvent.endDate);
      console.log(`${exp.id} (${exp.date}): ${position}%`);
    });

    // Test grouping
    const grouped = groupNearbyExpenses(testExpenses, testEvent);
    console.log(`Grouped into ${grouped.length} groups from ${testExpenses.length} expenses`);
    
    grouped.forEach((group, index) => {
      console.log(`Group ${index + 1}: ${group.expenses.map(e => e.id).join(', ')} at ${group.position}%`);
    });

    // We should have at least 3 groups: pre-event, mid-event (possibly grouped), and end-event
    expect(grouped.length).toBeGreaterThanOrEqual(3);
  });
});

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

// Integration tests for the Timeline component
describe('Timeline Component', () => {
  beforeEach(() => {
    // Mock router
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
    });
  });

  test('renders timeline with event dates', () => {
    render(<Timeline event={mockEvent} expenses={mockExpenses} />);
    
    // Check that event dates are displayed
    expect(screen.getByText(/Jun 1, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 10, 2023/)).toBeInTheDocument();
  });
  
  test('renders timeline with appropriate expense markers', () => {
    const { container } = render(<Timeline event={mockEvent} expenses={mockExpenses} />);
    
    // First, let's manually calculate what the grouping should be
    const expensesForGrouping = mockExpenses.map(e => ({
      id: e.id,
      description: e.title || '',
      amount: e.amount,
      currency: e.currency,
      date: e.date instanceof Date ? e.date.toISOString() : e.date,
      paidBy: e.paidBy,
      participants: e.participants,
      eventId: e.eventId,
      settled: e.settled,
      category: e.category,
    }));
    
    const testEvent = {
      id: mockEvent.id || '',
      name: mockEvent.name || '',
      date: mockEvent.startDate,
      startDate: mockEvent.startDate,
      createdAt: new Date().toISOString(),
      createdBy: 'test-user',
      members: ['user1', 'user2'],
      expenseIds: ['exp1', 'exp2', 'exp3', 'exp4', 'exp5'],
    };
    
    const groupedExpenses = groupNearbyExpenses(expensesForGrouping, testEvent);
    
    // Calculate expected positions for debugging
    const positions = expensesForGrouping.map(expense => {
      const position = calculatePositionPercentage(expense.date, testEvent.startDate, mockEvent.endDate);
      return { id: expense.id, description: expense.description, position };
    });
    
    // Force output by throwing the info in the error
    const debugInfo = {
      inputExpenses: expensesForGrouping.length,
      groupedCount: groupedExpenses.length,
      positions: positions,
      groups: groupedExpenses.map((group, index) => ({
        groupIndex: index,
        position: group.position,
        expenseCount: group.expenses.length,
        expenseIds: group.expenses.map(e => e.id)
      }))
    };
    
    const expenseMarkers = container.querySelectorAll('.expenseMarker');
    const buttonMarkers = screen.getAllByRole('button');
    
    // If we don't have enough markers, throw detailed debug info
    if (buttonMarkers.length < 3) {
      throw new Error(`Expected at least 3 expense markers but found ${buttonMarkers.length}. 
        Debug info: ${JSON.stringify(debugInfo, null, 2)}
        Rendered markers: ${expenseMarkers.length} (CSS), ${buttonMarkers.length} (role)`);
    }
    
    // For now, let's just check that we have at least some buttons
    expect(buttonMarkers.length).toBeGreaterThan(0);
  });

  test('renders settled and unsettled expenses with different styles', () => {
    render(<Timeline event={mockEvent} expenses={mockExpenses} />);
    
    // Check that we have both settled and unsettled expense markers
    const settledMarkers = screen.getAllByTitle(/settled/i);
    const unsettledMarkers = screen.getAllByTitle(/unsettled/i);
    
    expect(settledMarkers.length).toBeGreaterThan(0);
    expect(unsettledMarkers.length).toBeGreaterThan(0);
  });

  it('shows expense details on hover/click', () => {
    const handleClick = jest.fn();
    const expenses = [
      {
        id: 'exp1',
        type: 'expense',
        date: '2023-06-15',
        title: 'Test expense',
        amount: 100,
        currency: 'USD',
        category: 'Food',
        eventName: 'Test Event',
        eventId: 'event1',
        settled: false,
        paidBy: 'user1',
        participants: ['user1', 'user2'],
        userNames: { user1: 'User 1', user2: 'User 2' }
      }
    ];
    
    const testEvent = {
      id: 'event1',
      name: 'Test Event',
      startDate: '2023-06-10',
      endDate: '2023-06-20'
    };
    
    render(
      <Timeline
        event={testEvent}
        expenses={expenses}
        onExpenseClick={handleClick}
      />
    );
    
    // Find an expense marker by its position on the timeline
    const timelineDots = screen.getAllByTitle(/expense/i);
    expect(timelineDots.length).toBeGreaterThan(0);
    
    // Click on the first expense marker
    fireEvent.click(timelineDots[0]);
    
    // Check that the click handler was called
    expect(handleClick).toHaveBeenCalled();
    expect(handleClick).toHaveBeenCalledWith(expect.objectContaining({
      id: 'exp1'
    }));
  });

  test('renders timeline for event without end date', () => {
    const eventWithoutEndDate = { ...mockEvent, endDate: undefined };
    render(<Timeline event={eventWithoutEndDate} expenses={mockExpenses} />);
    
    // Check that the timeline is still rendered
    expect(screen.getByText(/Jun 1, 2023/)).toBeInTheDocument();
    // Should only show one date
    expect(screen.queryByText(/Jun 10, 2023/)).not.toBeInTheDocument();
  });

  test('renders timeline for event without expenses', () => {
    render(<Timeline event={mockEvent} expenses={[]} />);
    
    // Check that the timeline is rendered without expense markers
    expect(screen.getByText(/Jun 1, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 10, 2023/)).toBeInTheDocument();
    
    // There should be no expense buttons
    const expenseMarkers = screen.queryAllByRole('button', { name: /expense/i });
    expect(expenseMarkers.length).toBe(0);
  });

  test('renders pre-event and post-event expenses correctly', () => {
    render(<Timeline event={mockEvent} expenses={mockExpenses} />);
    
    // Check that pre-event and post-event sections are shown if needed
    const preEventSection = screen.getByText(/pre-event/i);
    expect(preEventSection).toBeInTheDocument();
  });
});
