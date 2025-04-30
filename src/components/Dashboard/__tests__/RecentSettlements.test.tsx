import { render, screen } from '@testing-library/react';
import RecentSettlements from '../RecentSettlements';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('RecentSettlements', () => {
  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 },
    { id: 'user3', name: 'Charlie', balance: 0 }
  ];
  
  const mockEvents = [
    { id: 'event1', name: 'Vacation', startDate: '2023-05-01', participants: ['user1', 'user2'], expenses: [] },
    { id: 'event2', name: 'Dinner', startDate: '2023-05-15', participants: ['user1', 'user3'], expenses: [] }
  ];
  
  const mockSettlements = [
    { 
      id: 'settlement1', 
      fromUser: 'user1', 
      toUser: 'user2', 
      amount: 25.50, 
      date: '2023-05-20', 
      expenseIds: ['exp1'], 
      eventId: 'event1' 
    },
    { 
      id: 'settlement2', 
      fromUser: 'user3', 
      toUser: 'user1', 
      amount: 15.75, 
      date: '2023-05-22', 
      expenseIds: ['exp2'], 
      eventId: 'event2' 
    }
  ];

  it('renders recent settlements correctly with data', () => {
    render(
      <RecentSettlements 
        settlements={mockSettlements} 
        users={mockUsers} 
        events={mockEvents} 
      />
    );
    
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    
    // Check if user names are displayed correctly
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    
    // Check if amounts are displayed correctly
    expect(screen.getByText('$25.50')).toBeInTheDocument();
    expect(screen.getByText('$15.75')).toBeInTheDocument();
    
    // Check if dates are displayed
    expect(screen.getByText('5/20/2023')).toBeInTheDocument();
    expect(screen.getByText('5/22/2023')).toBeInTheDocument();
    
    // Check if event names are displayed
    expect(screen.getByText('Vacation')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    
    // Check if "View all settlements" link is displayed
    const viewAllLink = screen.getByText('View all settlements');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/settlements');
  });

  it('handles empty data correctly', () => {
    render(
      <RecentSettlements 
        settlements={[]} 
        users={mockUsers} 
        events={mockEvents} 
      />
    );
    
    expect(screen.getByText('Recent Settlements')).toBeInTheDocument();
    expect(screen.getByText('No settlements yet')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all settlements')).toBeInTheDocument();
  });

  it('correctly displays payment direction arrows', () => {
    render(
      <RecentSettlements 
        settlements={mockSettlements} 
        users={mockUsers} 
        events={mockEvents} 
      />
    );
    
    // Check if direction arrows are displayed
    const arrows = screen.getAllByText('→');
    expect(arrows.length).toBe(2);
  });
});
