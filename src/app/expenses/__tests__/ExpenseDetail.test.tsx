import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppProvider } from '../../../context/AppContext';
import { useParams, useRouter } from 'next/navigation';

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn()
}));

// Mock for next/link
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, href, ...rest }: { children: React.ReactNode; href: string; [key: string]: any }) => {
    const { passHref, replace, scroll, shallow, locale, ...anchorProps } = rest;
    return <a href={href} {...anchorProps}>{children}</a>;
  };
});

// Mock Timeline component
jest.mock('../../../components/ui/Timeline', () => {
  return function MockTimeline(props: { event?: { name?: string } }) {
    return <div data-testid="mock-timeline">Timeline for {props.event?.name ?? 'Unknown Event'}</div>;
  };
});

// Mock EditableText component (ensure this is identical to the one in EventDetail.test.tsx if shared logic is desired)
jest.mock('../../../components/ui/EditableText', () => {
  return function MockEditableText({ value, onSave, className, as }: { value: string; onSave: (value: string) => void; className?: string; as?: React.ElementType }) {
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
import ExpenseDetail from '../[id]/page';

// Define mock data outside describe for broader scope in jest.mock
const mockExpenseInitial = {
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
  category: 'Food' // Added for completeness
};

const mockEventInitial = {
  id: 'event-1',
  name: 'Test Event',
  description: 'Test Description',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-01-10T00:00:00.000Z',
  participants: ['user-1', 'user-2'],
  expenses: ['expense-1']
};

const mockUsers = [
  { id: 'user-1', name: 'User One', preferredCurrency: 'USD', balance: 0 },
  { id: 'user-2', name: 'User Two', preferredCurrency: 'EUR', balance: 0 }
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
      getSymbol: (currencyCode: string) => (currencyCode === 'USD' ? '$' : '€'), // Basic mock for getSymbol
      // Add other context values if ExpenseDetail uses them
      preferredCurrency: 'USD',
      isConvertingCurrencies: false,
      setIsConvertingCurrencies: jest.fn(),
      setPreferredCurrency: jest.fn(),
    }),
  };
});

describe('ExpenseDetail Page', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Deep clone initial mock data
    mockState = {
        expenses: [JSON.parse(JSON.stringify(mockExpenseInitial))],
        events: [JSON.parse(JSON.stringify(mockEventInitial))],
        users: JSON.parse(JSON.stringify(mockUsers)),
        settlements: []
    };
    
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), back: jest.fn() });
    (useParams as jest.Mock).mockReturnValue({ id: 'expense-1' });
  });

  const renderComponent = () => {
    return render(
      <AppProvider initialState={mockState}>
        <ExpenseDetail />
      </AppProvider>
    );
  }
  
  test('renders expense details correctly', () => {
    renderComponent();
    expect(screen.getByText(mockExpenseInitial.description)).toBeInTheDocument(); 
    expect(screen.getByText(mockExpenseInitial.amount.toFixed(2))).toBeInTheDocument(); 
    const user1 = mockUsers.find(u => u.id === mockExpenseInitial.paidBy);
    if (user1) {
      // Find the "Paid By" label, then its parent container, then the value within that container
      const paidByLabel = screen.getByText('Paid By');
      const detailItemContainer = paidByLabel.closest('div[class*="detailItem"]'); // Use a more specific selector if needed
      if (detailItemContainer) {
        expect(within(detailItemContainer as HTMLElement).getByText(user1.name)).toBeInTheDocument();
      } else {
        throw new Error('Could not find the container for the "Paid By" detail item.');
      }
    }
    if (mockExpenseInitial.notes) expect(screen.getByText(mockExpenseInitial.notes)).toBeInTheDocument();
    expect(screen.getByText(new Date(mockExpenseInitial.date).toLocaleDateString())).toBeInTheDocument();
  });
  
  test('allows editing expense description and reflects change', async () => {
    const { rerender } = renderComponent();
    const descriptionDisplayElement = screen.getByText(mockExpenseInitial.description);
    fireEvent.click(descriptionDisplayElement);
    
    const inputField = await screen.findByRole('textbox');
    expect(inputField).toBeInTheDocument();

    const updatedDescription = 'Updated Expense Description';
    fireEvent.change(inputField, { target: { value: updatedDescription } });
    fireEvent.keyDown(inputField, { key: 'Enter', code: 'Enter' });
    
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UPDATE_EXPENSE',
      payload: {
        ...mockExpenseInitial,
        description: updatedDescription
      }
    });
    
    mockState.expenses[0].description = updatedDescription;
    rerender(
        <AppProvider initialState={mockState}>
          <ExpenseDetail />
        </AppProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(updatedDescription)).toBeInTheDocument();
    });
  });

  test('allows editing expense notes and reflects change', async () => {
    const { rerender } = renderComponent();
    // Ensure notes are present for this test
    if (!mockExpenseInitial.notes) throw new Error('Initial mock expense must have notes for this test');

    const notesDisplayElement = screen.getByText(mockExpenseInitial.notes);
    fireEvent.click(notesDisplayElement);

    // The input field for notes should now be present.
    // We need to find the correct textbox. Since description is also editable, 
    // we rely on the fact that clicking the notes text makes its corresponding input appear.
    // The mock EditableText uses data-testid="editable-text-input" for the input.
    // We need to ensure we are targeting the correct one if multiple are rendered.
    // For this test, we assume the one that appears after clicking notesDisplayElement is the target.
    // A more robust way would be to ensure unique identifiers or context for each EditableText instance.
    const inputFields = await screen.findAllByRole('textbox');
    // Find the input field that has the current notes value, assuming it was focused or is the new one.
    const notesInputField = inputFields.find(input => (input as HTMLInputElement).value === mockExpenseInitial.notes);

    if (!notesInputField) throw new Error('Notes input field not found or not correctly identified');
    
    expect(notesInputField).toBeInTheDocument();

    const updatedNotes = 'Updated test note';
    fireEvent.change(notesInputField, { target: { value: updatedNotes } });
    fireEvent.keyDown(notesInputField, { key: 'Enter', code: 'Enter' });

    expect(mockDispatch).toHaveBeenCalledWith({
        type: 'UPDATE_EXPENSE',
        payload: {
            ...mockExpenseInitial,
            notes: updatedNotes
        }
    });

    mockState.expenses[0].notes = updatedNotes;
    rerender(
        <AppProvider initialState={mockState}>
          <ExpenseDetail />
        </AppProvider>
    );

    await waitFor(() => {
        expect(screen.getByText(updatedNotes)).toBeInTheDocument();
    });
  });
});