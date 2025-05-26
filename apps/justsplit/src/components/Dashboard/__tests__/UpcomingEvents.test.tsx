import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import UpcomingEvents from '../UpcomingEvents';
import { AppProvider, AppState } from '../../../context/AppContext';
import { AuthContext, AuthContextType } from '../../../context/AuthContext';
import { User, Event as EventType } from '../../../types';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const MockLink: React.FC<{ children: React.ReactNode, href: string }> = ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Consistent mock auth value for tests requiring full provider setup
const mockAuthContextValue: AuthContextType = {
  currentUser: { uid: 'user1' } as { uid: string },
  userProfile: { id: 'user1', name: 'Alice', email: 'alice@example.com', balance: 0 } as User,
  isLoading: false,
  signIn: jest.fn().mockResolvedValue(undefined),
  signUp: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  signInWithProvider: jest.fn().mockResolvedValue(undefined),
  linkAccount: jest.fn().mockResolvedValue(undefined),
  resetPassword: jest.fn().mockResolvedValue(undefined),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  handleDatabaseRecovery: jest.fn().mockResolvedValue(undefined),
  hasDatabaseCorruption: false,
};

// Wrapper for tests that need full context setup
const FullProvidersWrapper: React.FC<{
  children: React.ReactNode;
  initialAppState?: Partial<AppState>;
}> = ({ children, initialAppState }) => {
  return (
    <AuthContext.Provider value={mockAuthContextValue}>
      <AppProvider initialState={initialAppState}>
        {children}
      </AppProvider>
    </AuthContext.Provider>
  );
};

const mockEvents: EventType[] = [
  {
    id: 'event1',
    name: 'Team Trip',
    startDate: '2023-06-15',
    endDate: '2023-06-20',
    location: 'Beach',
    description: 'Annual team trip',
    members: ['user1', 'user2'],
    expenseIds: [],
    createdBy: 'user1',
    date: '2023-06-15',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'event2',
    name: 'Movie Night',
    startDate: '2023-05-15',
    endDate: '2023-05-15',
    location: 'Cinema',
    description: 'Watching the latest movie',
    members: ['user1', 'user3'],
    expenseIds: [],
    createdBy: 'user1',
    date: '2023-05-15',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'event3',
    name: 'Past Event', 
    startDate: '2022-10-10',
    endDate: '2022-10-15',
    location: 'Home', 
    description: 'This happened in the past',
    members: ['user1'],
    expenseIds: [],
    createdBy: 'user1',
    date: '2022-10-10',
    createdAt: new Date().toISOString(),
  }
];

const mockUsers: User[] = [
    { id: 'user1', name: 'Alice', balance: 0, email: 'alice@example.com' },
    { id: 'user2', name: 'Bob', balance: 0, email: 'bob@example.com' },
    { id: 'user3', name: 'Charlie', balance: 0, email: 'charlie@example.com' }
];

const mockAppState: Partial<AppState> = {
  events: mockEvents,
  expenses: [],
  settlements: [],
  users: mockUsers,
  currentUser: mockUsers[0],
  isDataLoaded: true,
};

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2023-05-20'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpcomingEvents', () => {
  it('renders upcoming events correctly with data', () => {
    render(
      <FullProvidersWrapper initialAppState={mockAppState}>
        <UpcomingEvents />
      </FullProvidersWrapper>
    );
    
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Movie Night')).toBeInTheDocument();
    expect(screen.getByText('Beach')).toBeInTheDocument();
    expect(screen.getByText('Cinema')).toBeInTheDocument();
  });

  it('handles empty data correctly', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: [],
          users: [],
          expenses: [],
          settlements: [],
          currentUser: mockUsers[0],
          isDataLoaded: true,
        }
      }
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });

  it('links to individual event details pages', () => {
    render(
      <FullProvidersWrapper initialAppState={mockAppState}>
        <UpcomingEvents />
      </FullProvidersWrapper>
    );
    
    const eventLinks = screen.getAllByRole('link');
    const event1Link = eventLinks.find(link => 
      link.getAttribute('href')?.includes('/events/event1')
    );
    const event2Link = eventLinks.find(link => 
      link.getAttribute('href')?.includes('/events/event2')
    );
    
    expect(event1Link).toBeInTheDocument();
    expect(event2Link).toBeInTheDocument();
  });

  it('renders event cards with correct info', () => {
    render(
      <FullProvidersWrapper initialAppState={mockAppState}>
        <UpcomingEvents />
      </FullProvidersWrapper>
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Beach')).toBeInTheDocument();
    expect(screen.getByText('Annual team trip')).toBeInTheDocument();
  });

  it('shows status badge for upcoming and past events', () => {
    render(
      <FullProvidersWrapper initialAppState={mockAppState}>
        <UpcomingEvents />
      </FullProvidersWrapper>
    );
    
    const upcomingElements = screen.getAllByText(/Upcoming/i);
    const pastElements = screen.getAllByText(/Past/i);
    
    expect(upcomingElements.length).toBeGreaterThan(0);
    expect(pastElements.length).toBeGreaterThan(0);
  });

  it('shows "No upcoming events" if empty', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: [],
          users: mockUsers,
          expenses: [],
          settlements: [],
          currentUser: mockUsers[0],
          isDataLoaded: true,
        }
      }
    );
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('shows "View all events" link', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: mockEvents,
          users: mockUsers,
          expenses: [],
          settlements: [],
          currentUser: mockUsers[0],
          isDataLoaded: true,
        }
      }
    );
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });
});
