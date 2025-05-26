import React from 'react';
import { screen } from '@testing-library/react';
import Home from '../page';
import EventList from '../events/list/page';
import { renderWithProviders } from '../../test-utils';
import { AppState } from '../../context/AppContext';
import { Event as EventType, User } from '../../types';

jest.mock('next/link', () => {
  const MockLink: React.FC<{ children: React.ReactNode; href: string; className?: string }> = ({ children, href, className }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn().mockImplementation((date, formatString) => {
    if (date && formatString) {
      try {
        const parsedDate = new Date(date);
        return parsedDate.toLocaleDateString();
      } catch {
        return 'Invalid Date';
      }
    }
    return 'Invalid Date';
  }),
}));

describe('Home', () => {
  test('renders heading and description', () => {
    renderWithProviders(<Home />);
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
  
  test('renders the action buttons', () => {
    renderWithProviders(<Home />);
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});

describe('EventList', () => {
  test('displays event information correctly', () => {
    const mockEventsData: EventType[] = [
      {
        id: 'event1',
        name: 'Team Trip',
        description: 'A fun trip',
        date: '2023-06-15',
        startDate: '2023-06-15',
        endDate: '2023-06-20',
        location: 'Beach',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        members: [], 
        expenseIds: [],
      },
      {
        id: 'event2',
        name: 'Conference',
        description: 'A serious conference',
        date: '2023-07-10',
        startDate: '2023-07-10',
        endDate: '2023-07-15',
        location: 'City Hall',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        members: [], 
        expenseIds: [],
      }
    ];

    const mockUser: User = { id: 'user1', name: 'Test User', balance: 0, email: 'test@user.com' };
    const mockInitialAppState: Partial<AppState> = {
      events: mockEventsData,
      currentUser: mockUser,
      users: [mockUser],
      isDataLoaded: true,
      groups: [],
    };

    renderWithProviders(<EventList />, { 
      initialState: mockInitialAppState
    });

    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    
    const detailsButtons = screen.getAllByText('View Details');
    expect(detailsButtons.length).toBe(2);
    
    expect(screen.getAllByText('Participants: 0').length).toBe(2);
  });
});

const mockUserForDashboard: User = { id: 'u1', name: 'Alice', balance: 0, email: 'alice@example.com' };
const mockDashboardState: Partial<AppState> = {
  users: [mockUserForDashboard, { id: 'u2', name: 'Bob', balance: 0, email: 'bob@example.com' } as User],
  events: [
    { id: 'e1', name: 'Trip', startDate: '2025-05-13', endDate: '2025-05-15', members: ['u1', 'u2'], expenseIds: [], date: '2025-05-13', createdBy:'u1', createdAt: new Date().toISOString(), description: 'Test Event' } as EventType
  ],
  expenses: [
    { id: 'exp1', description: 'Dinner', amount: 100, currency: 'USD', date: '2025-05-01', paidBy: 'u1', participants: ['u1', 'u2'], settled: false, createdAt: new Date().toISOString() },
    { id: 'exp2', description: 'Lunch', amount: 50, currency: 'USD', date: '2025-04-01', paidBy: 'u2', participants: ['u1', 'u2'], settled: true, createdAt: new Date().toISOString() }
  ],
  settlements: [
    { id: 's1', fromUser: 'u2', toUser: 'u1', amount: 50, currency: 'USD', expenseIds: ['exp2'], date: '2025-05-10'}
  ],
  currentUser: mockUserForDashboard,
  isDataLoaded: true,
  groups: [],
};

describe('Home Dashboard Page', () => {
  it('renders dashboard sections and KPIs', async () => {
    renderWithProviders(<Home />, {initialState: mockDashboardState});
    
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Period Summary')).toBeInTheDocument();
    expect(screen.getByText('Balance Situation')).toBeInTheDocument();
    expect(screen.getByText('Your Insights')).toBeInTheDocument();
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    expect(screen.getByText('Expense Distribution')).toBeInTheDocument();
  });

  it('shows WelcomeScreen if no data', () => {
    renderWithProviders(<Home />, {
      initialState: { users: [], events: [], expenses: [], settlements: [], currentUser: null, isDataLoaded: false, groups: [] }
    });
    expect(screen.getByText('JustSplit')).toBeInTheDocument();
    expect(screen.getByText('Fair expense splitting, made simple.')).toBeInTheDocument();
  });

  it('Home Dashboard Page renders dashboard sections and KPIs', () => {
    const mockSpecificUser: User = { id: 'u1', name: 'Alice', balance: 0, email: 'alice@example.com' };
    const mockSpecificAppState: Partial<AppState> = {
      expenses: [
        { id: 'exp1', amount: 100, currency: 'USD', category: 'Food', description: 'food exp', date: 'date', paidBy:'u1', participants:['u1'], settled: false, createdAt: new Date().toISOString() }
      ],
      events: [
        { id: 'event1', name: 'Trip', startDate: '2023-06-01', endDate: '2023-06-05', members: [], date: 'date', createdBy:'u1', createdAt: new Date().toISOString(), expenseIds:[], description: 'Desc' }
      ],
      currentUser: mockSpecificUser,
      users: [mockSpecificUser],
      isDataLoaded: true,
      groups: [],
      settlements: [],
    };

    renderWithProviders(<Home />, { initialState: mockSpecificAppState });
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getAllByText('Add Expense').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Create Event')).toBeInTheDocument();
    expect(screen.getByText('Export Expenses')).toBeInTheDocument();
    expect(screen.getByText('Currency:')).toBeInTheDocument(); // This should exist from CurrencySelector
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });
});
