import { render, screen, fireEvent } from '@testing-library/react';
import MonthlyTrendsChart from '../MonthlyTrendsChart';

describe('MonthlyTrendsChart', () => {
  const mockUsers = [
    { id: 'user1', name: 'User 1', balance: 0 },
    { id: 'user2', name: 'User 2', balance: 0 }
  ];
  
  const mockEvents = [
    { id: 'event1', name: 'Event 1', startDate: '2023-01-01', participants: ['user1', 'user2'], expenses: [] },
    { id: 'event2', name: 'Event 2', startDate: '2023-02-01', participants: ['user1', 'user2'], expenses: [] }
  ];
  
  const mockProcessedTrends = [
    {
      month: 'Jan',
      amount: 120,
      count: 2,
      byEvent: [
        { id: 'event1', name: 'Event 1', amount: 80, percentage: 66.67 },
        { id: 'no-event', name: 'No Event', amount: 40, percentage: 33.33 }
      ],
      byPayer: [
        { id: 'user1', name: 'User 1', amount: 120, percentage: 100 }
      ]
    },
    {
      month: 'Feb',
      amount: 200,
      count: 3,
      byEvent: [
        { id: 'event2', name: 'Event 2', amount: 150, percentage: 75 },
        { id: 'no-event', name: 'No Event', amount: 50, percentage: 25 }
      ],
      byPayer: [
        { id: 'user1', name: 'User 1', amount: 100, percentage: 50 },
        { id: 'user2', name: 'User 2', amount: 100, percentage: 50 }
      ]
    }
  ];

  it('renders loading state correctly', () => {
    render(
      <MonthlyTrendsChart 
        processedTrends={[]} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={true}
        conversionError={null}
        preferredCurrency="USD"
      />
    );
    
    expect(screen.getByText('Loading exchange rates...')).toBeInTheDocument();
  });

  it('renders chart with data correctly', () => {
    render(
      <MonthlyTrendsChart 
        processedTrends={mockProcessedTrends} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={false}
        conversionError={null}
        preferredCurrency="USD"
      />
    );
    
    expect(screen.getByText('Monthly Expense Trends')).toBeInTheDocument();
    expect(screen.getByText('Jan')).toBeInTheDocument();
    expect(screen.getByText('Feb')).toBeInTheDocument();
    expect(screen.getByText('Last 6 Months Total:')).toBeInTheDocument();
    expect(screen.getByText('USD 320.00')).toBeInTheDocument();
  });

  it('shows conversion error when present', () => {
    const errorMessage = "Error converting currencies. Using original amounts.";
    
    render(
      <MonthlyTrendsChart 
        processedTrends={mockProcessedTrends} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={false}
        conversionError={errorMessage}
        preferredCurrency="USD"
      />
    );
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('toggles between event and spender view', () => {
    render(
      <MonthlyTrendsChart 
        processedTrends={mockProcessedTrends} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={false}
        conversionError={null}
        preferredCurrency="USD"
      />
    );
    
    // Initially should show Event view
    expect(screen.getByText('Event')).toHaveClass('toggleActive');
    expect(screen.getByText('Spender')).not.toHaveClass('toggleActive');
    
    // Click on Spender button
    fireEvent.click(screen.getByText('Spender'));
    
    // Now Spender should be active
    expect(screen.getByText('Event')).not.toHaveClass('toggleActive');
    expect(screen.getByText('Spender')).toHaveClass('toggleActive');
    
    // And we should see the user legend items
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
  });

  it('toggles currency conversion checkbox', () => {
    render(
      <MonthlyTrendsChart 
        processedTrends={mockProcessedTrends} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={false}
        conversionError={null}
        preferredCurrency="USD"
      />
    );
    
    const checkbox = screen.getByLabelText('Convert currencies');
    expect(checkbox).toBeChecked();
    
    // Click to uncheck
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });
});
