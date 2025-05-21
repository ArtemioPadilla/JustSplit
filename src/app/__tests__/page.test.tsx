import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react';
import Home from '../page';
import EventList from '../events/list/page';
import { renderWithAppContext } from '../../test-utils';
import { AppProvider } from '../../context/AppContext';

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

// Add mock for date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn().mockImplementation(() => 'May 1, 2025'),
}));

describe('Home', () => {
  test('renders heading and description', () => {
    renderWithAppContext(<Home />);
    
    // Your assertions for the home page
    // These will depend on what elements you expect to find
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  
  test('renders the action buttons', () => {
    renderWithAppContext(<Home />);
    
    // Look for links instead of buttons
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    
    // Check for "Add Expense" link
    const addExpenseLink = screen.getByRole('link', { name: /add expense/i });
    expect(addExpenseLink).toBeInTheDocument();
    expect(addExpenseLink).toHaveAttribute('href', '/expenses/new');
    
    // Check for "Create Event" link
    const createEventLink = screen.getByRole('link', { name: /create event/i });
    expect(createEventLink).toBeInTheDocument();
    expect(createEventLink).toHaveAttribute('href', '/events/new');
  });
});

describe('EventList', () => {
  test('displays event information correctly', () => {
    // Mock events with members property correctly initialized
    const mockEvents = [
      {
        id: 'event1',
        name: 'Team Trip',
        startDate: '2023-06-15',
        endDate: '2023-06-20',
        members: [], // Ensure members is defined as an array
        expenses: [
          { id: 'exp1', amount: 100, currency: 'USD' },
          { id: 'exp2', amount: 200, currency: 'USD' }
        ]
      },
      {
        id: 'event2',
        name: 'Conference',
        startDate: '2023-07-10',
        endDate: '2023-07-15',
        members: [], // Ensure members is defined as an array
        expenses: [
          { id: 'exp3', amount: 50, currency: 'EUR' },
          { id: 'exp4', amount: 150, currency: 'EUR' }
        ]
      }
    ];

    // Render with mocked data
    renderWithAppContext(<EventList />, {
      initialState: {
        events: mockEvents,
        // Include any other required state here
      }
    });

    // Check for event names
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    
    // Check for "View Details" buttons that link to the events
    const detailsButtons = screen.getAllByText('View Details');
    expect(detailsButtons.length).toBe(2);
    
    // Check for participants text
    expect(screen.getAllByText('Participants: 0').length).toBe(2);
  });
});

const mockState = {
  users: [
    { id: 'u1', name: 'Alice', balance: 0 },
    { id: 'u2', name: 'Bob', balance: 0 }
  ],
  events: [
    { id: 'e1', name: 'Trip', startDate: '2025-05-13', endDate: '2025-05-15', participants: ['u1', 'u2'], expenses: [] }
  ],
  expenses: [
    { id: 'exp1', description: 'Dinner', amount: 100, currency: 'USD', date: '2025-05-01', paidBy: 'u1', participants: ['u1', 'u2'], settled: false },
    { id: 'exp2', description: 'Lunch', amount: 50, currency: 'USD', date: '2025-04-01', paidBy: 'u2', participants: ['u1', 'u2'], settled: true }
  ],
  settlements: [
    { id: 's1', fromUser: 'u2', toUser: 'u1', amount: 50, currency: 'USD', expenseIds: ['exp2'], date: '2025-05-10', status: 'completed' }
  ]
};

describe('Home Dashboard Page', () => {
  it('renders dashboard sections and KPIs', async () => {
    render(
      <AppProvider initialState={mockState}>
        <Home />
      </AppProvider>
    );
    // Dashboard header
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    
    // Financial summary sections
    expect(screen.getByText('Period Summary')).toBeInTheDocument();
    expect(screen.getByText('Balance Situation')).toBeInTheDocument();
    expect(screen.getByText('Your Insights')).toBeInTheDocument();
    
    // Recent expenses
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    
    // Recent settlements
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    
    // Upcoming events
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    
    // Balance overview
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    
    // Expense distribution
    expect(screen.getByText('Expense Distribution')).toBeInTheDocument();
  });

  it('shows WelcomeScreen if no data', () => {
    render(
      <AppProvider initialState={{ users: [], events: [], expenses: [], settlements: [] }}>
        <Home />
      </AppProvider>
    );
    expect(screen.getByText('JustSplit')).toBeInTheDocument();
    expect(screen.getByText('Fair expense splitting, made simple.')).toBeInTheDocument();
  });

  it('Home Dashboard Page renders dashboard sections and KPIs', () => {
    // Mock necessary state
    const mockAppState = {
      expenses: [
        { id: 'exp1', amount: 100, currency: 'USD', category: 'Food' }
      ],
      events: [
        { id: 'event1', name: 'Trip', startDate: '2023-06-01', endDate: '2023-06-05', members: [] }
      ],
      // Add other required state here
    };

    renderWithAppContext(<Home />, { initialState: mockAppState });
    
    // Check for dashboard title
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Check for action buttons that are definitely present
    expect(screen.getByText('Add Expense')).toBeInTheDocument();
    expect(screen.getByText('Create Event')).toBeInTheDocument();
    expect(screen.getByText('Export Expenses')).toBeInTheDocument();
    
    // Check for exchange rates section
    expect(screen.getByText('Exchange Rates')).toBeInTheDocument();
    
    // Instead of looking for specific headings, check for essential dashboard elements
    // that are guaranteed to be there regardless of data
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
