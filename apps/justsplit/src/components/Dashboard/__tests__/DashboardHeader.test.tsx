import { screen, fireEvent } from '@testing-library/react';
import DashboardHeader from '../DashboardHeader';
import { exportExpensesToCSV } from '../../../utils/csvExport';
import { renderWithAppContext } from '../../../test-utils';

// Mock dependencies
jest.mock('../../../utils/csvExport', () => ({
  exportExpensesToCSV: jest.fn()
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  LinkComponent.displayName = 'Link';
  return LinkComponent;
});

describe('DashboardHeader', () => {
  const mockExpenses = [
    { 
      id: '1', 
      description: 'Test Expense', 
      amount: 50, 
      date: '2023-01-01', 
      paidBy: 'user1', 
      participants: ['user1', 'user2'], 
      currency: 'USD', 
      settled: false,
      createdAt: '2023-01-01T00:00:00.000Z'
    }
  ];
  const mockUsers = [
    { id: 'user1', name: 'User 1', balance: 0 },
    { id: 'user2', name: 'User 2', balance: 0 }
  ];
  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Test Event', 
      date: '2023-01-01',
      startDate: '2023-01-01', 
      endDate: '2023-01-02',
      createdAt: '2023-01-01T00:00:00.000Z',
      createdBy: 'user1',
      members: ['user1', 'user2'], 
      expenseIds: ['1'] 
    }
  ];

  it('renders dashboard title correctly', () => {
    renderWithAppContext(
      <DashboardHeader expenses={mockExpenses} users={mockUsers} events={mockEvents} />,
      {
        initialState: {
          users: mockUsers,
          expenses: mockExpenses,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders action buttons with correct links', () => {
    renderWithAppContext(
      <DashboardHeader expenses={mockExpenses} users={mockUsers} events={mockEvents} />,
      {
        initialState: {
          users: mockUsers,
          expenses: mockExpenses,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    const addExpenseButton = screen.getByText('Add Expense');
    const createEventButton = screen.getByText('Create Event');
    
    expect(addExpenseButton).toBeInTheDocument();
    expect(addExpenseButton.closest('a')).toHaveAttribute('href', '/expenses/new');
    
    expect(createEventButton).toBeInTheDocument();
    expect(createEventButton.closest('a')).toHaveAttribute('href', '/events/new');
  });

  it('calls exportExpensesToCSV when export button is clicked', () => {
    renderWithAppContext(
      <DashboardHeader expenses={mockExpenses} users={mockUsers} events={mockEvents} />,
      {
        initialState: {
          users: mockUsers,
          expenses: mockExpenses,
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    expect(exportExpensesToCSV).toHaveBeenCalledWith(
      mockExpenses, 
      mockUsers, 
      [{ expenses: ["1"], id: "event1", name: "Test Event", participants: ["user1", "user2"], startDate: "2023-01-01" }],
      'all-expenses.csv'
    );
  });

  it('disables export button when there are no expenses', () => {
    renderWithAppContext(
      <DashboardHeader expenses={[]} users={mockUsers} events={mockEvents} />,
      {
        initialState: {
          users: mockUsers,
          expenses: [],
          events: mockEvents,
          settlements: []
        }
      }
    );
    
    const exportButton = screen.getByText('Export Expenses');
    expect(exportButton).toBeDisabled();
  });
});
