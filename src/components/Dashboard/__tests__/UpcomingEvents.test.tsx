import React from 'react';
import { render, screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import UpcomingEvents from '../UpcomingEvents';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

// Create more complete mock events with all required fields
const mockEvents = [
  {
    id: 'event1',
    name: 'Team Trip',
    startDate: '2023-06-15',
    endDate: '2023-06-20',
    location: 'Beach',
    description: 'Annual team trip',
    members: ['user1', 'user2'],
    expenses: []
  },
  {
    id: 'event2',
    name: 'Movie Night',
    startDate: '2023-05-15',
    endDate: '2023-05-15',
    location: 'Cinema',
    description: 'Watching the latest movie',
    members: ['user1', 'user3'],
    expenses: []
  },
  {
    id: 'event3',
    name: 'Past Event', 
    startDate: '2022-10-10',
    endDate: '2022-10-15',
    location: 'Home', 
    description: 'This happened in the past',
    members: ['user1'],
    expenses: []
  }
];

// Set up a complete mock state for the context
const mockAppState = {
  events: mockEvents,
  expenses: [],
  settlements: [],
  users: {
    user1: { id: 'user1', name: 'Alice' },
    user2: { id: 'user2', name: 'Bob' },
    user3: { id: 'user3', name: 'Charlie' }
  },
  currentUser: { id: 'user1', name: 'Alice' }
};

// Mock current date
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
      <AppContext.Provider value={{ state: mockAppState, dispatch: jest.fn() }}>
        <UpcomingEvents />
      </AppContext.Provider>
    );
    
    // Check if event titles are displayed (be more precise in what we're looking for)
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Movie Night')).toBeInTheDocument();
    
    // Check for locations
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
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });

  it('links to individual event details pages', () => {
    render(
      <AppContext.Provider value={{ state: mockAppState, dispatch: jest.fn() }}>
        <UpcomingEvents />
      </AppContext.Provider>
    );
    
    // Find all links and check their hrefs
    const eventLinks = screen.getAllByRole('link');
    
    // Check that at least one link contains each event ID
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
      <AppContext.Provider value={{ state: mockAppState, dispatch: jest.fn() }}>
        <UpcomingEvents />
      </AppContext.Provider>
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    
    // Test for exact text matches
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Beach')).toBeInTheDocument();
    expect(screen.getByText('Annual team trip')).toBeInTheDocument();
  });

  it('shows status badge for upcoming and past events', () => {
    render(
      <AppContext.Provider value={{ state: mockAppState, dispatch: jest.fn() }}>
        <UpcomingEvents />
      </AppContext.Provider>
    );
    
    // Use getAllByText since "Upcoming" might appear multiple times
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
          users: [],
          expenses: [],
          settlements: []
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
          users: [],
          expenses: [],
          settlements: []
        }
      }
    );
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });
});
