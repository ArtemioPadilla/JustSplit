import { render, screen } from '@testing-library/react';
import UpcomingEvents from '../UpcomingEvents';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('UpcomingEvents', () => {
  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Beach Trip', 
      startDate: '2023-06-15', 
      endDate: '2023-06-20', 
      participants: ['user1', 'user2', 'user3'], 
      expenses: [] 
    },
    { 
      id: 'event2', 
      name: 'Dinner Party', 
      startDate: '2023-07-01', 
      participants: ['user1', 'user2'], 
      expenses: [] 
    },
    { 
      id: 'event3', 
      name: 'Concert', 
      startDate: '2023-08-10', 
      participants: ['user1', 'user3', 'user4'], 
      expenses: [] 
    }
  ];

  it('renders upcoming events correctly with data', () => {
    render(<UpcomingEvents events={mockEvents} />);
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    
    // Check if event names are displayed
    expect(screen.getByText('Beach Trip')).toBeInTheDocument();
    expect(screen.getByText('Dinner Party')).toBeInTheDocument();
    expect(screen.getByText('Concert')).toBeInTheDocument();
    
    // Check if dates are displayed correctly
    expect(screen.getByText('6/15/2023 - 6/20/2023')).toBeInTheDocument();
    expect(screen.getByText('7/1/2023')).toBeInTheDocument();
    expect(screen.getByText('8/10/2023')).toBeInTheDocument();
    
    // Check if participant counts are displayed correctly
    expect(screen.getByText('3 participants')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
    expect(screen.getByText('3 participants')).toBeInTheDocument();
    
    // Check if "View all events" link is displayed
    const viewAllLink = screen.getByText('View all events');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/events/list');
  });

  it('handles empty data correctly', () => {
    render(<UpcomingEvents events={[]} />);
    
    expect(screen.getByText('Upcoming Events')).toBeInTheDocument();
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all events')).toBeInTheDocument();
  });

  it('links to individual event details pages', () => {
    render(<UpcomingEvents events={mockEvents} />);
    
    // Check if links to event details are correct
    const beachTripLink = screen.getByText('Beach Trip').closest('a');
    const dinnerPartyLink = screen.getByText('Dinner Party').closest('a');
    const concertLink = screen.getByText('Concert').closest('a');
    
    expect(beachTripLink).toHaveAttribute('href', '/events/event1');
    expect(dinnerPartyLink).toHaveAttribute('href', '/events/event2');
    expect(concertLink).toHaveAttribute('href', '/events/event3');
  });
});
