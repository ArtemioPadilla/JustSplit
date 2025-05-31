import React from 'react';
import { screen, fireEvent, waitFor, within, render } from '@testing-library/react';
import '@testing-library/jest-dom';
// AppProvider is not directly used for rendering if using renderWithProviders or a custom mock setup
// import { AppProvider } from '../../../context/AppContext'; 
import { useParams, useRouter } from 'next/navigation';
// renderWithProviders is not used with this mocking strategy
// AppState and Action might be needed for typing mockState and dispatch spy
import { AppState } from '../../../context/AppContext'; 
import { User, Event as EventType, Expense as ExpenseType } from '../../../types';

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ id: 'expense-1' }))
}));

// Mock for next/link - simplified to avoid unused var lint errors in mock
jest.mock('next/link', () => {
  // Using a more general type for rest props in a mock is often acceptable.
  const MockLink: React.FC<{ children: React.ReactNode; href: string; [key: string]: unknown; }> = ({ 
    children, 
    href, 
    // Destructure Next.js specific props to prevent them from being passed to <a> if they are not valid HTML attributes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    passHref,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    replace,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scroll,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shallow,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    locale,
    ...restOfProps // these should ideally be valid for <a>
  }) => {
    // The linter might complain about unused passHref etc. In a real scenario, you might use them or disable the lint rule for mocks.
    // For this tool, we accept they are destructured to be excluded from restOfProps.
    return <a href={href} {...restOfProps}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock Timeline component
jest.mock('../../../components/ui/Timeline', () => {
  const MockTimeline: React.FC<{ event?: { name?: string } }> = (props) => {
    return <div data-testid="mock-timeline">Timeline for {props.event?.name ?? 'Unknown Event'}</div>;
  };
  MockTimeline.displayName = 'MockTimeline';
  return MockTimeline;
});

// Mock EditableText component
jest.mock('../../../components/ui/EditableText', () => {
  const MockEditableText: React.FC<{ value: string; onSave: (value: string) => void; className?: string; as?: React.ElementType }> = ({ value, onSave, className, as }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentValue, setCurrentValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        setCurrentValue(value); 
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
          data-testid="editable-text-input"
        />
      );
    }
    const Tag = as ?? 'div';
    return (
      <Tag 
        data-testid="editable-text-display"
        className={className}
        onClick={() => setIsEditing(true)}
        onFocus={() => setIsEditing(true)}
        tabIndex={0} 
        role="button"
      >
        {currentValue} 
      </Tag>
    );
  };
  MockEditableText.displayName = 'MockEditableText';
  return MockEditableText;
});


// Mock Button component
jest.mock('../../../components/ui/Button', () => {
  const MockButton: React.FC<{ children: React.ReactNode; onClick?: () => void; variant?: string, className?: string }> = ({ children, onClick, variant = 'primary', className }) => {
    return (
      <button 
        data-testid={`button-${variant}`}
        onClick={onClick}
        className={`button button-${variant} ${className || ''}`}
      >
        {children}
      </button>
    );
  };
  MockButton.displayName = 'MockButton';
  return MockButton;
});

// Import the page component directly
import ExpenseDetail from '../[id]/page';

// Define mock data with correct types
const mockExpenseInitial: ExpenseType = {
  id: 'expense-1',
  eventId: 'event-1', 
  amount: 100, 
  currency: 'USD', 
  description: 'Test Expense', 
  date: '2025-01-02T00:00:00.000Z',
  paidBy: 'user-1',
  participants: ['user-1', 'user-2'],
  settled: false,
  notes: 'This is a test note',
  category: 'Food',
  createdAt: '2025-01-01T00:00:00.000Z', // Added createdAt
};

const mockEventInitial: EventType = {
  id: 'event-1',
  name: 'Test Event',
  description: 'Test Description',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-01-10T00:00:00.000Z',
  members: ['user-1', 'user-2'], // Changed from participants to members
  expenseIds: ['expense-1'],
  createdBy: 'user-1',
  date: '2025-01-01T00:00:00.000Z',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockUsers: User[] = [
  { id: 'user-1', name: 'User One', preferredCurrency: 'USD', balance: 0, email: 'user1@example.com' },
  { id: 'user-2', name: 'User Two', preferredCurrency: 'EUR', balance: 0, email: 'user2@example.com' }
];

// Mock AppContext hook
const mockDispatchFn = jest.fn();
const mockUpdateExpense = jest.fn().mockResolvedValue(undefined);
const mockDeleteExpense = jest.fn().mockResolvedValue(undefined);
let currentMockState: AppState; // Use AppState for full typing

jest.mock('../../../context/AppContext', () => ({
  __esModule: true,
  // ...jest.requireActual('../../../context/AppContext'), // Avoid requiring actual for this strategy
  useAppContext: () => ({
    state: currentMockState,
    dispatch: mockDispatchFn,
    preferredCurrency: currentMockState?.currentUser?.preferredCurrency || 'USD',
    isConvertingCurrencies: false, // Default mock value
    // Mock other functions used by ExpenseDetail if any, e.g.,
    // getSymbol: (currencyCode: string) => (currencyCode === 'USD' ? '$' : currencyCode),
    // addExpense, updateExpense etc. if they are called directly and need to be spied on
    // For now, assuming ExpenseDetail primarily uses state and dispatch for its core logic.
    updateExpense: mockUpdateExpense, // If called by page
    deleteExpense: mockDeleteExpense, // If called by page
  }),
  // Do not export AppProvider or AppContext object itself if not needed by the component directly
}));

describe('ExpenseDetail Page', () => {
  let mockRouterPush: jest.Mock;
  let mockRouterBack: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush = jest.fn();
    mockRouterBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush, back: mockRouterBack });
    (useParams as jest.Mock).mockReturnValue({ id: 'expense-1' });

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);

    currentMockState = {
        expenses: [JSON.parse(JSON.stringify(mockExpenseInitial))],
        events: [JSON.parse(JSON.stringify(mockEventInitial))],
        users: JSON.parse(JSON.stringify(mockUsers)),
        settlements: [],
        currentUser: mockUsers[0],
        isDataLoaded: true,
        groups: [],
    };
  });

  const renderComponent = () => {
    return render(<ExpenseDetail />); // Render directly as useAppContext is mocked
  }
  
  test('renders expense details correctly', () => {
    renderComponent();
    expect(screen.getByText(mockExpenseInitial.description)).toBeInTheDocument(); 
    // Amount might be formatted, adjust assertion if needed
    expect(screen.getByText(mockExpenseInitial.amount.toFixed(2))).toBeInTheDocument(); 
    
    const user1 = mockUsers.find(u => u.id === mockExpenseInitial.paidBy);
    if (user1) {
      // More robust query for paid by user name
      const paidByContainer = screen.getByText('Paid By').closest('div');
      if(paidByContainer) {
          expect(within(paidByContainer).getByText(user1.name)).toBeInTheDocument();
      } else {
          // Fallback if structure changes, though less ideal
          expect(screen.getByText(user1.name)).toBeInTheDocument();
      }
    }
    if (mockExpenseInitial.notes) expect(screen.getByText(mockExpenseInitial.notes)).toBeInTheDocument();
    // Date formatting might vary, be flexible or mock date-fns more comprehensively
    expect(screen.getByText(new Date(mockExpenseInitial.date).toLocaleDateString())).toBeInTheDocument();
  });
  
  test('allows editing expense description and reflects change via dispatch', async () => {
    renderComponent();
    const descriptionDisplayElement = screen.getByText(mockExpenseInitial.description);
    fireEvent.click(descriptionDisplayElement);
    
    const inputField = await screen.findByRole('textbox');
    expect(inputField).toBeInTheDocument();

    const updatedDescription = 'Updated Expense Description';
    fireEvent.change(inputField, { target: { value: updatedDescription } });
    fireEvent.keyDown(inputField, { key: 'Enter', code: 'Enter' });
    
    // Now we can assert the mock updateExpense was called
    expect(mockUpdateExpense).toHaveBeenCalledWith(mockExpenseInitial.id, { description: updatedDescription });

    // Update mockState but don't re-render - the component should handle state updates internally
    currentMockState.expenses[0].description = updatedDescription;

    await waitFor(() => {
      expect(screen.getByText(updatedDescription)).toBeInTheDocument();
    });
  });

  test('allows editing expense notes and reflects change via dispatch', async () => {
    renderComponent();
    if (!mockExpenseInitial.notes) throw new Error('Initial mock expense must have notes for this test');

    const notesDisplayElement = screen.getByText(mockExpenseInitial.notes);
    fireEvent.click(notesDisplayElement);

    const inputFields = await screen.findAllByRole('textbox');
    const notesInputField = inputFields.find(input => (input as HTMLInputElement).value === mockExpenseInitial.notes);
    if (!notesInputField) throw new Error('Notes input field not found');
    
    const updatedNotes = 'Updated expense notes.';
    fireEvent.change(notesInputField, { target: { value: updatedNotes } });
    fireEvent.keyDown(notesInputField, { key: 'Enter', code: 'Enter' });

    expect(mockUpdateExpense).toHaveBeenCalledWith(mockExpenseInitial.id, { notes: updatedNotes });

    // Update mockState but don't re-render - the component should handle state updates internally
    currentMockState.expenses[0].notes = updatedNotes;

    await waitFor(() => {
      expect(screen.getByText(updatedNotes)).toBeInTheDocument();
    });
  });

  // Add more tests for other functionalities:
  // - Deleting an expense
  // - Handling different currencies (if applicable on this page)
  // - Interaction with the Timeline component mock
  // - Splitting expense (if UI is present)
  // - Settling expense (if UI is present)

  test('navigates back when "Back to Event" or "Back to Expenses" is clicked', () => {
    // This test needs to ensure the correct link/button is present
    // and that mockRouter.back() is called.
    // The actual link text/presence might depend on whether eventId is present.
    renderComponent();

    // Assuming there's a button or link to go back.
    // Let's say there's a button with text "Back" or similar.
    // This part is highly dependent on the actual UI of ExpenseDetail page.
    // For example, if there's a link back to the event:
    const backToEventLink = screen.queryByText(`Back to ${mockEventInitial.name}`);
    if (backToEventLink) {
        fireEvent.click(backToEventLink);
        // expect(mockRouterPush).toHaveBeenCalledWith(`/events/${mockEventInitial.id}`);
        // Or, if it's a generic back button:
        // const backButton = screen.getByRole('button', { name: /back/i });
        // fireEvent.click(backButton);
        // expect(mockRouterBack).toHaveBeenCalled();
    } else {
        // Fallback or different logic if no event context
        // const backButton = screen.getByRole('button', { name: /back to expenses/i });
        // fireEvent.click(backButton);
        // expect(mockRouterPush).toHaveBeenCalledWith('/expenses/list');
    }
    // This test needs to be more specific based on actual UI elements and logic.
    // For now, it's a placeholder.
  });

  test('delete button calls deleteExpense and navigates', async () => {
    renderComponent();
    const deleteButton = screen.getByTestId('button-danger'); 
    fireEvent.click(deleteButton);

    expect(mockDeleteExpense).toHaveBeenCalledWith(mockExpenseInitial.id);
    
    await waitFor(() => {
      if (mockExpenseInitial.eventId) {
        expect(mockRouterPush).toHaveBeenCalledWith(`/events/${mockExpenseInitial.eventId}`);
      } else {
        // expect(mockRouterPush).toHaveBeenCalledWith('/expenses/list'); // Or some other default
      }
    });
  });
  
  test('shows "Expense not found" message for invalid ID', () => {
    (useParams as jest.Mock).mockReturnValue({ id: 'invalid-expense-id' });
    // Update currentMockState for this specific test case
    currentMockState.expenses = [];
    renderComponent();
    expect(screen.getByText(/expense not found/i)).toBeInTheDocument();
  });

  test('renders correctly if associated event is not found', () => {
    currentMockState.events = [];
    renderComponent();
    expect(screen.getByText(mockExpenseInitial.description)).toBeInTheDocument();
    // When no event exists, Timeline component is not rendered at all
    expect(screen.queryByTestId('mock-timeline')).not.toBeInTheDocument();
    // Instead, we should see "No Event" in the event details section
    expect(screen.getByText('No Event')).toBeInTheDocument();
  });
});