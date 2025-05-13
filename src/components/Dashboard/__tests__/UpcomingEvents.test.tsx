import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import UpcomingEvents from '../UpcomingEvents';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return <a href={href} data-testid="next-link">{children}</a>;
  };
});

describe('UpcomingEvents', () => {
  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Team Trip', // changed from title
      description: 'Weekend getaway', 
      startDate: '2023-06-15', 
      endDate: '2023-06-20',
      location: 'Mountain Cabin',
      participants: ['user1', 'user2'],
      expenses: ['exp1', 'exp2']
    },
    { 
      id: 'event2', 
      name: 'Movie Night', // changed from title
      description: 'Movie marathon', 
      startDate: '2023-07-01', 
      endDate: '2023-07-02',
      location: 'Bob\'s place',
      participants: ['user2', 'user3', 'user4'],
      expenses: []
    }
  ];

  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 },
    { id: 'user4', name: 'Dave', balance: 0 }
  ];

  it('renders upcoming events correctly with data', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: mockEvents,
          users: mockUsers,
          expenses: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    
    // Check if event titles are displayed
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText('Movie Night')).toBeInTheDocument();
    
    // Check for locations
    expect(screen.getByText('Mountain Cabin')).toBeInTheDocument();
    expect(screen.getByText('Bob\'s place')).toBeInTheDocument();
    
    // Check for formatted dates - now using abbreviated months
    expect(screen.getByText(/Jun 14 - Jun 19, 2023/)).toBeInTheDocument();
    expect(screen.getByText(/Jun 30 - Jul 1, 2023/)).toBeInTheDocument();
    
    // Check if "View all events" link is displayed
    const viewAllLink = screen.getByText('View all events');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/events');
  });

  it('handles empty data correctly', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: [],
          users: mockUsers,
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
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: mockEvents,
          users: mockUsers,
          expenses: [],
          settlements: []
        }
      }
    );
    
    const links = screen.getAllByTestId('next-link');
    const eventLinks = links.filter(link => link.getAttribute('href').startsWith('/events/'));
    expect(eventLinks.length).toBeGreaterThan(0);
  });

  it('renders event cards with correct info', () => {
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: [
            {
              id: 'event3',
              name: 'Trip',
              description: 'Business Trip',
              startDate: '2023-08-15',
              endDate: '2023-08-20',
              location: 'Beach',
              participants: ['user1', 'user2']
            },
            {
              id: 'event4',
              name: 'Conference',
              description: 'Tech Conference',
              startDate: '2022-05-15',
              endDate: '2022-05-16',
              location: 'Old Place',
              participants: ['user2', 'user3']
            },
            {
              id: 'event5',
              name: 'Past Event',
              description: 'Past event',
              startDate: '2022-01-01',
              participants: ['user1']
            }
          ],
          users: mockUsers,
          expenses: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Trip')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    expect(screen.getByText('Past Event')).toBeInTheDocument();
    expect(screen.getByText('Beach')).toBeInTheDocument();
    expect(screen.getByText('Old Place')).toBeInTheDocument();
    expect(screen.getByText(/No location/)).toBeInTheDocument();
    
    // Use getAllByText for elements that might appear multiple times
    const participantCountElements = screen.getAllByText(/2 participant/);
    expect(participantCountElements.length).toBe(2);
    
    // Check for specific participant lists - Using getAllByText for possible duplicates
    const aliceAndBob = screen.getByText('Alice, Bob');
    expect(aliceAndBob).toBeInTheDocument();
    
    const bobAndCharlie = screen.getByText('Bob, Charlie');
    expect(bobAndCharlie).toBeInTheDocument();
    
    expect(screen.getByText('1 participant')).toBeInTheDocument();
  });

  it('shows status badge for upcoming and past events', () => {
    // Use a date in the past and one in the future for testing
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    renderWithAppContext(
      <UpcomingEvents />,
      {
        initialState: {
          events: [
            {
              id: 'past',
              name: 'Past Event',
              startDate: pastDate.toISOString().split('T')[0],
              endDate: pastDate.toISOString().split('T')[0]
            },
            {
              id: 'future',
              name: 'Future Event',
              startDate: futureDate.toISOString().split('T')[0],
              endDate: futureDate.toISOString().split('T')[0]
            }
          ],
          users: mockUsers,
          expenses: [],
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
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
          users: mockUsers,
          expenses: [],
          settlements: []
        }
      }
    );
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });
});
