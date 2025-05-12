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

describe('UpcomingEvents', () => {
  const mockEvents = [
    { 
      id: 'event1', 
      title: 'Team Trip', 
      description: 'Weekend getaway', 
      startDate: '2023-06-15', 
      endDate: '2023-06-20',
      location: 'Mountain Cabin',
      participants: ['user1', 'user2'],
      expenses: ['exp1', 'exp2']
    },
    { 
      id: 'event2', 
      title: 'Movie Night', 
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
    
    // Use getAllByText for checking months since they appear multiple times
    expect(screen.getAllByText(/June/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/July/i).length).toBeGreaterThan(0);
    
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
    render(<UpcomingEvents events={mockEvents} users={mockUsers} />);
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('Trip')).toBeInTheDocument();
    expect(screen.getByText('Conference')).toBeInTheDocument();
    expect(screen.getByText('Past Event')).toBeInTheDocument();
    expect(screen.getByText('Beach')).toBeInTheDocument();
    expect(screen.getByText('Old Place')).toBeInTheDocument();
    expect(screen.getByText('No location')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
    expect(screen.getByText('Alice, Bob')).toBeInTheDocument();
    expect(screen.getByText('Bob, Charlie')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows status badge for upcoming and past events', () => {
    render(<UpcomingEvents events={mockEvents} users={mockUsers} />);
    expect(screen.getAllByText('Upcoming').length).toBeGreaterThan(0);
    expect(screen.getByText('Past')).toBeInTheDocument();
  });

  it('shows "No upcoming events" if empty', () => {
    render(<UpcomingEvents events={[]} users={mockUsers} />);
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('shows "View all events" link', () => {
    render(<UpcomingEvents events={mockEvents} users={mockUsers} />);
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });
});
