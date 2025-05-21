import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppProvider } from '../../../context/AppContext'; // useAppContext removed as it's mocked below
import { useParams, useRouter } from 'next/navigation';

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ id: 'event-1' }))
}));

// Mock for next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: any }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passHref, replace, scroll, shallow, locale, ...anchorProps } = rest;
    return <a href={href} {...anchorProps}>{children}</a>;
  };
});

// Mock EditableText component
jest.mock('../../../components/ui/EditableText', () => {
  return function MockEditableText({ value, onSave, className, as }: { value: string; onSave: (value: string) => void; className?: string; as?: React.ElementType }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentValue, setCurrentValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setCurrentValue(value); // Keep internal state in sync with prop
    }, [value]);

    const handleSave = () => {
      onSave(currentValue);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          role="textbox" 
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSave();
            } else if (e.key === 'Escape') {
              setCurrentValue(value); 
              setIsEditing(false);
            }
          }}
          autoFocus
          data-testid="editable-text-input" // Added for easier selection if needed
        />
      );
    }

    // Render as the specified tag or div by default
    const Tag = as ?? 'div'; // Use nullish coalescing
    return (
      <Tag 
        data-testid="editable-text-display" // Changed testid to differentiate display and input
        className={className}
        onClick={() => setIsEditing(true)}
        onFocus={() => setIsEditing(true)} // Added onFocus for keyboard accessibility if needed
        tabIndex={0} // Make it focusable
        role="button" // Semantic role
      >
        {currentValue} {/* Display currentValue to reflect updates */}
      </Tag>
    );
  };
});


// Mock necessary components to simplify testing
jest.mock('../../../components/ui/Timeline', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function MockTimeline(props: any) {
    return <div data-testid="mock-timeline">Timeline Component</div>;
  };
});

jest.mock('../../../components/ui/ProgressBar', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function MockProgressBar(props: any) {
    return <div data-testid="mock-progress-bar">Progress Bar Component</div>;
  };
});

// Mock Button component
jest.mock('../../../components/ui/Button', () => {
  return function MockButton({ children, onClick, variant = 'primary' }: { children: React.ReactNode; onClick?: () => void; variant?: string }) {
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

// Define mockState and mockDispatch outside of describe for broader scope in jest.mock
const mockEventInitial = {
  id: 'event-1',
  name: 'Test Event',
  description: 'Test Description',
  startDate: '2025-01-01T00:00:00.000Z', 
  endDate: '2025-01-10T00:00:00.000Z',   
  participants: ['user-1', 'user-2'],
  expenses: ['expense-1', 'expense-2'], 
  preferredCurrency: 'USD' 
};

const mockUsers = [
  { id: 'user-1', name: 'User One', preferredCurrency: 'USD', balance: 0 },
  { id: 'user-2', name: 'User Two', preferredCurrency: 'EUR', balance: 0 }
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

const mockDispatch = jest.fn();

let mockState: any; // Defined in beforeEach

// Mock AppContext
jest.mock('../../../context/AppContext', () => {
  const originalModule = jest.requireActual('../../../context/AppContext');
  return {
    ...originalModule,
    useAppContext: () => ({
      state: mockState, 
      dispatch: mockDispatch, 
    }),
  };
});


describe('EventDetail Page', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mockState to initial values before each test
    mockState = {
        events: [JSON.parse(JSON.stringify(mockEventInitial))], // Deep clone initial mock data to ensure test isolation for state modifications
        expenses: JSON.parse(JSON.stringify(mockExpenses)),
        users: JSON.parse(JSON.stringify(mockUsers)),
        settlements: []
    };
    
    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      back: jest.fn()
    });
    
    (useParams as jest.Mock).mockReturnValue({
      id: 'event-1'
    });
  });

  const renderComponent = () => {
    return render(
      <AppProvider initialState={mockState}> {/* Pass current mockState */}
        <EventDetail />
      </AppProvider>
    );
  }
  
  test('renders event details correctly', () => {
    renderComponent();
    expect(screen.getByText(mockEventInitial.name)).toBeInTheDocument();
    expect(screen.getByText(mockEventInitial.description)).toBeInTheDocument();
    // Use toLocaleDateString for date comparison, matching component behavior
    expect(screen.getByText(new Date(mockEventInitial.startDate).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(mockEventInitial.endDate).toLocaleDateString())).toBeInTheDocument();
  });
  
  test('allows editing event name and reflects change', async () => {
    const { rerender } = renderComponent(); // Get rerender function
    const eventNameDisplayElement = screen.getByText(mockEventInitial.name);
    fireEvent.click(eventNameDisplayElement);
    
    const inputField = await screen.findByRole('textbox');
    expect(inputField).toBeInTheDocument();

    const updatedEventName = 'Updated Event Name';
    fireEvent.change(inputField, { target: { value: updatedEventName } });
    fireEvent.keyDown(inputField, { key: 'Enter', code: 'Enter' });
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EVENT',
      payload: {
        ...mockEventInitial, // original mockEvent
        name: updatedEventName
      }
    });
    
    // Simulate state update for UI change
    // In a real scenario, dispatch would update context, triggering re-render.
    // Here, we manually update the state that useAppContext mock returns.
    mockState.events[0].name = updatedEventName;

    // Rerender the component with the updated state
    rerender(
      <AppProvider initialState={mockState}>
        <EventDetail />
      </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(updatedEventName)).toBeInTheDocument();
    });
  });
});
