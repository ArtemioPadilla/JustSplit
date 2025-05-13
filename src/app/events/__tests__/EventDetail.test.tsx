import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppContextProvider } from '../../../context/AppContext';
import { useParams, useRouter } from 'next/navigation';

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}));

// Mock EditableText component
jest.mock('../../../components/ui/EditableText', () => {
  return function MockEditableText({ value, onSave, className }) {
    return (
      <div 
        data-testid="editable-text" 
        className={className}
        onClick={() => {
          // Simulate clicking to edit
          const input = document.createElement('input');
          input.setAttribute('role', 'textbox');
          input.value = value;
          
          // Replace the current element with the input
          const parent = document.activeElement.parentNode;
          if (parent) {
            parent.replaceChild(input, document.activeElement);
            
            // Focus the input
            input.focus();
            
            // Add event listeners for key presses
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                onSave(input.value);
              } else if (e.key === 'Escape') {
                // Just remove the input and restore original text
              }
            });
            
            // Add blur event listener
            input.addEventListener('blur', () => {
              onSave(input.value);
            });
          }
        }}
      >
        {value}
      </div>
    );
  };
});

// Mock necessary components to simplify testing
jest.mock('../../../components/ui/Timeline', () => {
  return function MockTimeline(props) {
    return <div data-testid="mock-timeline">Timeline Component</div>;
  };
});

jest.mock('../../../components/ui/ProgressBar', () => {
  return function MockProgressBar(props) {
    return <div data-testid="mock-progress-bar">Progress Bar Component</div>;
  };
});

// Mock Button component
jest.mock('../../../components/ui/Button', () => {
  return function MockButton({ children, onClick, variant = 'primary' }) {
    return (
      <button 
        data-testid={`button-${variant}`}
        onClick={onClick}
        className={`button button-${variant}`}
      >
        {children}
      </button>
    );
  };
});

// Import the page component directly
import EventDetail from '../[id]/page';

describe('EventDetail Page', () => {
  // Mock state values
  const mockEvent = {
    id: 'event-1',
    name: 'Test Event',
    description: 'Test Description',
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-01-10T00:00:00.000Z',
    participants: ['user-1', 'user-2']
  };
  
  const mockUsers = [
    { id: 'user-1', name: 'User One', preferredCurrency: 'USD' },
    { id: 'user-2', name: 'User Two', preferredCurrency: 'EUR' }
  ];
  
  const mockExpenses = [
    { 
      id: 'expense-1', 
      eventId: 'event-1', 
      amount: 100, 
      currency: 'USD', 
      description: 'Expense One', 
      date: '2025-01-02T00:00:00.000Z',
      paidBy: 'user-1',
      participants: ['user-1', 'user-2'],
      settled: false
    },
    { 
      id: 'expense-2', 
      eventId: 'event-1', 
      amount: 50, 
      currency: 'EUR', 
      description: 'Expense Two', 
      date: '2025-01-05T00:00:00.000Z',
      paidBy: 'user-2',
      participants: ['user-1', 'user-2'],
      settled: true
    }
  ];
  
  // Mock dispatch function to monitor calls
  const mockDispatch = jest.fn();
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup router mock
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      back: jest.fn()
    });
    
    // Setup params mock with event ID
    (useParams as jest.Mock).mockReturnValue({
      id: 'event-1'
    });
    
    // Create a mock state for the context
    const mockState = {
      events: [mockEvent],
      expenses: mockExpenses,
      users: mockUsers,
      settlements: []
    };
    
    // Render the component with the mocked context
    render(
      <AppContextProvider initialState={mockState} mockDispatch={mockDispatch}>
        <EventDetail />
      </AppContextProvider>
    );
  });
  
  test('renders event details correctly', () => {
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText(/Jan 1, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 10, 2025/)).toBeInTheDocument();
  });
  
  test('allows editing event name', async () => {
    // Find the event name (in an editable component)
    const eventNameElement = screen.getByText('Test Event');
    
    // Click on the event name to enter edit mode
    fireEvent.click(eventNameElement);
    
    // Find the input field that appeared after clicking
    const inputField = screen.getByRole('textbox');
    expect(inputField).toBeInTheDocument();
    expect(inputField).toHaveValue('Test Event');
    
    // Change the value
    fireEvent.change(inputField, { target: { value: 'Updated Event Name' } });
    expect(inputField).toHaveValue('Updated Event Name');
    
    // Press Enter to save
    fireEvent.keyDown(inputField, { key: 'Enter' });
    
    // Check if dispatch was called with the correct action
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EVENT',
      payload: {
        ...mockEvent,
        name: 'Updated Event Name'
      }
    });
    
    // Wait for the update feedback animation to start and finish
    await waitFor(() => {
      // Verify that the component shows the updated name
      expect(screen.getByText('Updated Event Name')).toBeInTheDocument();
    });
  });
  
  test('cancels event name edit on Escape key', () => {
    // Find the event name
    const eventNameElement = screen.getByText('Test Event');
    
    // Click on the event name to enter edit mode
    fireEvent.click(eventNameElement);
    
    // Find the input field
    const inputField = screen.getByRole('textbox');
    
    // Change the value
    fireEvent.change(inputField, { target: { value: 'Canceled Update' } });
    
    // Press Escape to cancel
    fireEvent.keyDown(inputField, { key: 'Escape' });
    
    // Check that dispatch was NOT called
    expect(mockDispatch).not.toHaveBeenCalled();
    
    // Verify the original name is still there
    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });
  
  test('event not found shows appropriate message', () => {
    // Re-render with a non-existent event ID
    (useParams as jest.Mock).mockReturnValue({ id: 'non-existent' });
    
    // Re-render the component
    render(
      <AppContextProvider initialState={{ events: [], expenses: [], users: [], settlements: [] }}>
        <EventDetail />
      </AppContextProvider>
    );
    
    expect(screen.getByText('Event Not Found')).toBeInTheDocument();
    expect(screen.getByText('The event you\'re looking for doesn\'t exist or has been deleted.')).toBeInTheDocument();
  });
});