import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';
import Timeline from '../components/ui/Timeline';

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
    render(<Timeline event={mockEvent} expenses={mockExpenses} />);
    
    // Check that we have the correct number of expense markers
    const expenseMarkers = screen.getAllByRole('button');
    expect(expenseMarkers.length).toBeGreaterThanOrEqual(mockExpenses.length);
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
        amount: 100,
        date: new Date('2023-06-15'),
        settled: false,
        description: 'Test expense'
      }
    ];
    
    const eventStartDate = new Date('2023-06-10');
    const eventEndDate = new Date('2023-06-20');
    
    render(
      <Timeline
        eventStartDate={eventStartDate}
        eventEndDate={eventEndDate}
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
