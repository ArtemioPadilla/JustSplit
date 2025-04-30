import { render, screen } from '@testing-library/react';
import RecentExpenses from '../RecentExpenses';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('RecentExpenses', () => {
  const mockUsers = [
    { id: 'user1', name: 'Alice', balance: 0 },
    { id: 'user2', name: 'Bob', balance: 0 }
  ];
  
  const mockExpenses = [
    { 
      id: 'exp1', 
      description: 'Dinner', 
      amount: 50, 
      currency: 'USD', 
      date: '2023-05-10', 
      paidBy: 'user1', 
      participants: ['user1', 'user2'], 
      settled: false 
    },
    { 
      id: 'exp2', 
      description: 'Movie tickets', 
      amount: 30, 
      currency: 'USD', 
      date: '2023-05-15', 
      paidBy: 'user2', 
      participants: ['user1', 'user2'], 
      settled: true 
    }
  ];

  it('renders recent expenses correctly with data', () => {
    render(<RecentExpenses expenses={mockExpenses} users={mockUsers} />);
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    
    // Check if expense descriptions are displayed
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Movie tickets')).toBeInTheDocument();
    
    // Check if amounts are displayed correctly
    expect(screen.getByText('USD 50.00')).toBeInTheDocument();
    expect(screen.getByText('USD 30.00')).toBeInTheDocument();
    
    // Check if payer names are displayed correctly
    expect(screen.getByText('Paid by Alice')).toBeInTheDocument();
    expect(screen.getByText('Paid by Bob')).toBeInTheDocument();
    
    // Check if dates are displayed
    expect(screen.getByText('5/10/2023')).toBeInTheDocument();
    expect(screen.getByText('5/15/2023')).toBeInTheDocument();
    
    // Check if "View all expenses" link is displayed
    const viewAllLink = screen.getByText('View all expenses');
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.closest('a')).toHaveAttribute('href', '/expenses/list');
  });

  it('handles empty data correctly', () => {
    render(<RecentExpenses expenses={[]} users={mockUsers} />);
    
    expect(screen.getByText('Recent Expenses')).toBeInTheDocument();
    expect(screen.getByText('No expenses yet')).toBeInTheDocument();
    
    // View all link should still be present
    expect(screen.getByText('View all expenses')).toBeInTheDocument();
  });

  it('links to individual expense details pages', () => {
    render(<RecentExpenses expenses={mockExpenses} users={mockUsers} />);
    
    // Check if links to expense details are correct
    const dinnerLink = screen.getByText('Dinner').closest('a');
    const movieLink = screen.getByText('Movie tickets').closest('a');
    
    expect(dinnerLink).toHaveAttribute('href', '/expenses/exp1');
    expect(movieLink).toHaveAttribute('href', '/expenses/exp2');
  });
});
