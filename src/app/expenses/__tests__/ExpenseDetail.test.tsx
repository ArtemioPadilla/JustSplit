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
  return function MockTimeline({ event, expenses }) {
    return <div data-testid="mock-timeline">Timeline Component</div>;
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

// Import the page component directly using the wrapper that we created
import ExpenseDetail from '../ExpenseDetail';

describe('ExpenseDetail Page', () => {
  // Mock state values
  const mockExpense = {
    id: 'expense-1',
    eventId: 'event-1', 
    amount: 100, 
    currency: 'USD', 
    description: 'Test Expense', 
    date: '2025-01-02T00:00:00.000Z',
    paidBy: 'user-1',
    participants: ['user-1', 'user-2'],
    settled: false,
    notes: 'This is a test note'
  };
  
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
    
    // Setup params mock with expense ID
    (useParams as jest.Mock).mockReturnValue({
      id: 'expense-1'
    });
    
    // Create a mock state for the context
    const mockState = {
      expenses: [mockExpense],
      events: [mockEvent],
      users: mockUsers,
      settlements: []
    };
    
    // Render the component with the mocked context
    render(
      <AppContextProvider initialState={mockState} mockDispatch={mockDispatch}>
        <ExpenseDetail />
      </AppContextProvider>
    );
  });
  
  test('renders expense details correctly', () => {
    expect(screen.getByTestId('editable-text')).toBeInTheDocument();
    expect(screen.getByText('Test Expense')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('This is a test note')).toBeInTheDocument();
  });
  
  test('allows editing expense description', async () => {
    // Find the expense description (in an editable component)
    const descriptionElement = screen.getByText('Test Expense');
    
    // Click on the description to enter edit mode
    fireEvent.click(descriptionElement);
    
    // Find the input field that appeared after clicking
    const inputField = screen.getByRole('textbox');
    expect(inputField).toBeInTheDocument();
    expect(inputField).toHaveValue('Test Expense');
    
    // Change the value
    fireEvent.change(inputField, { target: { value: 'Updated Expense Description' } });
    expect(inputField).toHaveValue('Updated Expense Description');
    
    // Press Enter to save
    fireEvent.keyDown(inputField, { key: 'Enter' });
    
    // Check if dispatch was called with the correct action
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EXPENSE',
      payload: {
        ...mockExpense,
        description: 'Updated Expense Description'
      }
    });
    
    // Wait for the update feedback animation to start and finish
    await waitFor(() => {
      // Verify that the component shows the updated description
      expect(screen.getByText('Updated Expense Description')).toBeInTheDocument();
    });
  });
  
  test('cancels expense description edit on Escape key', () => {
    // Find the expense description
    const descriptionElement = screen.getByText('Test Expense');
    
    // Click on the description to enter edit mode
    fireEvent.click(descriptionElement);
    
    // Find the input field
    const inputField = screen.getByRole('textbox');
    
    // Change the value
    fireEvent.change(inputField, { target: { value: 'Canceled Update' } });
    
    // Press Escape to cancel
    fireEvent.keyDown(inputField, { key: 'Escape' });
    
    // Check that dispatch was NOT called
    expect(mockDispatch).not.toHaveBeenCalled();
    
    // Verify the original description is still there
    expect(screen.getByText('Test Expense')).toBeInTheDocument();
  });
  
  test('saves expense description edit on blur', async () => {
    // Find the expense description
    const descriptionElement = screen.getByText('Test Expense');
    
    // Click on the description to enter edit mode
    fireEvent.click(descriptionElement);
    
    // Find the input field
    const inputField = screen.getByRole('textbox');
    
    // Change the value
    fireEvent.change(inputField, { target: { value: 'Blur Save Test' } });
    
    // Blur the input field
    fireEvent.blur(inputField);
    
    // Check if dispatch was called with the correct action
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EXPENSE',
      payload: {
        ...mockExpense,
        description: 'Blur Save Test'
      }
    });
    
    // Wait for the update feedback animation to start and finish
    await waitFor(() => {
      // Verify that the component shows the updated description
      expect(screen.getByText('Blur Save Test')).toBeInTheDocument();
    });
  });
  
  test('expense not found shows appropriate message', () => {
    // Re-render with a non-existent expense ID
    (useParams as jest.Mock).mockReturnValue({ id: 'non-existent' });
    
    // Re-render the component
    render(
      <AppContextProvider initialState={{ expenses: [], events: [], users: [], settlements: [] }}>
        <ExpenseDetail />
      </AppContextProvider>
    );
    
    expect(screen.getByText('Expense Not Found')).toBeInTheDocument();
    expect(screen.getByText('The expense you\'re looking for doesn\'t exist or has been deleted.')).toBeInTheDocument();
  });
});