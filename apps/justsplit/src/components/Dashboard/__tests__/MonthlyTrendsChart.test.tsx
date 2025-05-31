import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MonthlyTrendsChart from '../MonthlyTrendsChart';

// Mock the AppContext hook
jest.mock('../../../context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    state: {
      expenses: [
        { 
          id: 'exp1', 
          description: 'Test Expense 1',
          amount: 100,
          currency: 'USD',
          date: '2025-01-15',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          eventId: 'event1',
          settled: false,
          createdAt: '2025-01-15T00:00:00.000Z'
        },
        {
          id: 'exp2',
          description: 'Test Expense 2',
          amount: 50,
          currency: 'USD',
          date: '2025-02-15',
          paidBy: 'user2',
          participants: ['user1', 'user2'],
          eventId: 'event2',
          settled: false,
          createdAt: '2025-02-15T00:00:00.000Z'
        }
      ]
    }
  }))
}));

describe('MonthlyTrendsChart', () => {
  const mockUsers = [
    { id: 'user1', name: 'User 1', balance: 0 },
    { id: 'user2', name: 'User 2', balance: 0 }
  ];
  
  const mockEvents = [
    { 
      id: 'event1', 
      name: 'Event 1', 
      date: '2023-01-01',
      startDate: '2023-01-01', 
      createdAt: '2023-01-01T00:00:00.000Z',
      createdBy: 'user1',
      members: ['user1', 'user2'], 
      expenseIds: [] 
    },
    { 
      id: 'event2', 
      name: 'Event 2', 
      date: '2023-02-01',
      startDate: '2023-02-01', 
      createdAt: '2023-02-01T00:00:00.000Z',
      createdBy: 'user1',
      members: ['user1', 'user2'], 
      expenseIds: [] 
    }
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
    },
    {
      month: 'Mar',
      amount: 0,
      count: 0,
      byEvent: [],
      byPayer: []
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
    expect(screen.getByText('Mar')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();
    
    // Check for the total amount (more flexible approach)
    const legendValue = screen.getByText((content, element) => {
      return !!(element?.classList.contains('legendValue') && 
               content.includes('320.00'));
    });
    expect(legendValue).toBeInTheDocument();
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
    
    // Find the Event and Spender toggle buttons by text
    const eventButton = screen.getByText('Event');
    const spenderButton = screen.getByText('Spender');
    
    // Initially Event should have the toggleActive class
    expect(eventButton.className).toContain('toggleButton');
    
    // Click on Spender button
    fireEvent.click(spenderButton);
    
    // Now Spender should be active
    expect(spenderButton.className).toContain('toggleButton');
    
    // And we should see the user legend items
    expect(screen.getByText('User 1')).toBeInTheDocument();
    expect(screen.getByText('User 2')).toBeInTheDocument();
  });

  it('renders bars with proper heights based on amounts', () => {
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

    // Get all bar groups
    const barGroups = document.querySelectorAll('[class*="barGroup"]');
    expect(barGroups.length).toBe(3); // Jan, Feb, Mar
    
    // Test that Jan and Feb have visible bars (height > 1px)
    const janBarContainer = barGroups[0].querySelector('[class*="stackedBar"]');
    const febBarContainer = barGroups[1].querySelector('[class*="stackedBar"]');
    const marBarContainer = barGroups[2].querySelector('[class*="bar"]');
    
    expect(janBarContainer).toBeInTheDocument();
    expect(febBarContainer).toBeInTheDocument();
    
    // March should have minimal height since it has 0 amount
    expect(marBarContainer).toHaveStyle({ height: '1px' });
    expect(marBarContainer).toHaveStyle({ opacity: 0.3 });
  });

  it('renders stacked segments for months with breakdown data', () => {
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
    
    // January has 2 segments (Event 1 and No Event)
    const janBarContainer = document.querySelectorAll('[class*="barGroup"]')[0];
    const janSegments = janBarContainer.querySelectorAll('[class*="barSegment"]');
    expect(janSegments.length).toBe(2);
    
    // February has 2 segments (Event 2 and No Event)
    const febBarContainer = document.querySelectorAll('[class*="barGroup"]')[1];
    const febSegments = febBarContainer.querySelectorAll('[class*="barSegment"]');
    expect(febSegments.length).toBe(2);
    
    // March has no segments (empty)
    const marBarContainer = document.querySelectorAll('[class*="barGroup"]')[2];
    const marSegments = marBarContainer.querySelectorAll('[class*="barSegment"]');
    expect(marSegments.length).toBe(0);
  });
  
  it('displays currency values with the correct symbol', () => {
    render(
      <MonthlyTrendsChart 
        processedTrends={mockProcessedTrends} 
        users={mockUsers} 
        events={mockEvents}
        isLoadingRates={false}
        conversionError={null}
        preferredCurrency="MXN"
      />
    );
    
    // Check if MXN symbol ($) is shown for values
    const valueElements = document.querySelectorAll('[class*="barValue"]');
    expect(valueElements[0]).toHaveTextContent('$120');
    expect(valueElements[1]).toHaveTextContent('$200');
    expect(valueElements[2]).toHaveTextContent('$0');
  });

  it('applies correct styling to active and inactive toggle buttons', () => {
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
    
    // Find the Event and Spender toggle buttons
    const eventButton = screen.getByTestId('toggle-event');
    const spenderButton = screen.getByTestId('toggle-spender');
    
    // Event button should be active initially
    expect(eventButton).toHaveStyle({
      backgroundColor: '#1a56db',
      color: '#ffffff',
      fontWeight: 'bold',
      border: '1px solid #1a56db',
    });
    
    // Spender button should be inactive initially
    expect(spenderButton).toHaveStyle({
      backgroundColor: '#f9fafb',
      color: '#374151',
      fontWeight: '500',
      border: '1px solid #e5e7eb',
    });
    
    // Click on Spender button to toggle
    fireEvent.click(spenderButton);
    
    // Now Spender button should be active
    expect(spenderButton).toHaveStyle({
      backgroundColor: '#1a56db',
      color: '#ffffff',
      fontWeight: 'bold',
      border: '1px solid #1a56db',
    });
    
    // And Event button should be inactive
    expect(eventButton).toHaveStyle({
      backgroundColor: '#f9fafb',
      color: '#374151',
      fontWeight: '500',
      border: '1px solid #e5e7eb',
    });
  });
  
  it('ensures toggle buttons transition between states correctly', () => {
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
    
    // Find the Event and Spender toggle buttons
    const eventButton = screen.getByTestId('toggle-event');
    const spenderButton = screen.getByTestId('toggle-spender');
    
    // Check for transition property
    expect(eventButton).toHaveStyle('transition: all 0.2s ease');
    expect(spenderButton).toHaveStyle('transition: all 0.2s ease');
    
    // Check additional styling properties
    expect(eventButton).toHaveStyle('boxShadow: 0 2px 4px rgba(0,0,0,0.1)');
    expect(spenderButton).not.toHaveStyle('boxShadow: 0 2px 4px rgba(0,0,0,0.1)');
    
    // Verify padding is applied correctly
    expect(eventButton).toHaveStyle('padding: 0.4rem 0.75rem');
    expect(spenderButton).toHaveStyle('padding: 0.4rem 0.75rem');
  });
});
