import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
// AppProvider is not used when useAppContext is fully mocked
import { useParams, useRouter } from 'next/navigation';
import { AppState } from '../../../context/AppContext'; // For typing state
import { User, Event as EventType, Expense as ExpenseType } from '../../../types';

// Mock the next/navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ id: 'event-1' })) 
}));

// Mock for next/link - simplified
jest.mock('next/link', () => {
  const MockLink: React.FC<{ children: React.ReactNode; href: string; [key: string]: unknown; }> = ({ 
    children, href, ...restOfProps 
  }) => {
    return <a href={href} {...restOfProps}>{children}</a>;
  };
  MockLink.displayName = 'MockLink';
  return MockLink;
});

// Mock currency exchange utilities
jest.mock('../../../utils/currencyExchange', () => ({
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
  ],
  convertCurrency: jest.fn().mockResolvedValue({ convertedAmount: 100, exchangeRate: 1 }),
  formatCurrency: jest.fn((amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`),
  clearExchangeRateCache: jest.fn(),
}));

// Mock CSV export
jest.mock('../../../utils/csvExport', () => ({
  exportExpensesToCSV: jest.fn(),
}));

// Mock timeline utilities
jest.mock('../../../utils/timelineUtils', () => ({
  calculateSettledPercentage: jest.fn().mockReturnValue(50),
}));

// Mock UI Components (EditableText, Timeline, ProgressBar, Button)
jest.mock('../../../components/ui/EditableText', () => {
  const MockEditableText: React.FC<{ value: string; onSave: (value: string) => void; className?: string; as?: React.ElementType }> = ({ value, onSave, className, as }) => {
    const [isEditing, setIsEditing] = React.useState(false);
    const [currentValue, setCurrentValue] = React.useState(value);
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    React.useEffect(() => { setCurrentValue(value); }, [value]);
    const handleSave = () => { onSave(currentValue); setIsEditing(false); };
    
    if (isEditing) {
      return <input ref={inputRef} type="text" role="textbox" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} onBlur={handleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); else if (e.key === 'Escape') { setCurrentValue(value); setIsEditing(false); }}} autoFocus data-testid="editable-text-input" />;
    }
    const Tag = as ?? 'div';
    return <Tag data-testid="editable-text-display" className={className} onClick={() => setIsEditing(true)} onFocus={() => setIsEditing(true)} tabIndex={0} role="button">{currentValue}</Tag>;
  };
  MockEditableText.displayName = 'MockEditableText';
  return MockEditableText;
});
jest.mock('../../../components/ui/Timeline', () => {
  const MockTimeline: React.FC<Record<string, unknown>> = () => <div data-testid="mock-timeline">Timeline Component</div>;
  MockTimeline.displayName = 'MockTimeline';
  return MockTimeline;
});
jest.mock('../../../components/ui/ProgressBar', () => {
  const MockProgressBar: React.FC<Record<string, unknown>> = () => <div data-testid="mock-progress-bar">Progress Bar Component</div>;
  MockProgressBar.displayName = 'MockProgressBar';
  return MockProgressBar;
});
jest.mock('../../../components/ui/CurrencySelector', () => {
  const MockCurrencySelector: React.FC<{ value?: string; onChange?: (currency: string) => void; label?: string; [key: string]: unknown }> = ({ value = 'USD', onChange, label = 'Currency:' }) => (
    <div data-testid="currency-selector-container">
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange?.(e.target.value)} data-testid="currency-select">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="MXN">MXN</option>
      </select>
    </div>
  );
  MockCurrencySelector.displayName = 'MockCurrencySelector';
  return MockCurrencySelector;
});
jest.mock('../../../components/ui/Button', () => {
  const MockButton: React.FC<{ children: React.ReactNode; onClick?: () => void; variant?: string, className?: string; 'data-testid'?: string }> = ({ children, onClick, variant = 'primary', className, 'data-testid': dataTestId }) => {
    return <button data-testid={dataTestId || `button-${variant}`} onClick={onClick} className={`button button-${variant} ${className || ''}`}>{children}</button>;
  };
  MockButton.displayName = 'MockButton';
  return MockButton;
});

import EventDetail from '../[id]/page';

const mockEventInitial: EventType = {
  id: 'event-1', name: 'Test Event', description: 'Test Description',
  startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-10T00:00:00.000Z',   
  members: ['user-1', 'user-2'], expenseIds: ['expense-1', 'expense-2'], 
  preferredCurrency: 'USD', createdBy: 'user-1', date: '2025-01-01T00:00:00.000Z', 
  createdAt: '2025-01-01T00:00:00.000Z'
};
const mockUsers: User[] = [
  { id: 'user-1', name: 'User One', preferredCurrency: 'USD', balance: 0, email: 'user1@example.com' },
  { id: 'user-2', name: 'User Two', preferredCurrency: 'EUR', balance: 0, email: 'user2@example.com' }
];
const mockExpenses: ExpenseType[] = [
  { id: 'expense-1', eventId: 'event-1', amount: 100, currency: 'USD', description: 'Expense One', 
    date: '2025-01-02T00:00:00.000Z', paidBy: 'user-1', participants: ['user-1', 'user-2'], 
    settled: false, createdAt: '2025-01-01T00:00:00.000Z' },
  { id: 'expense-2', eventId: 'event-1', amount: 50, currency: 'EUR', description: 'Expense Two', 
    date: '2025-01-05T00:00:00.000Z', paidBy: 'user-2', participants: ['user-1', 'user-2'], 
    settled: true, createdAt: '2025-01-01T00:00:00.000Z' }
];

const mockEventDispatchFn = jest.fn();
const mockUpdateEvent = jest.fn().mockResolvedValue(undefined);
const mockDeleteEvent = jest.fn().mockResolvedValue(undefined);
const mockAddExpense = jest.fn().mockResolvedValue('new-mock-expense-id');
let currentEventMockState: AppState;

jest.mock('../../../context/AppContext', () => ({
  __esModule: true,
  useAppContext: () => ({
    state: currentEventMockState,
    dispatch: mockEventDispatchFn,
    preferredCurrency: currentEventMockState?.currentUser?.preferredCurrency || 'USD',
    isConvertingCurrencies: false,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
    addExpense: mockAddExpense,
    // Add other specific functions EventDetail might call from context
  }),
}));

describe('EventDetail Page', () => {
  let mockRouterPush: jest.Mock;
  let mockRouterBack: jest.Mock;
  let mockConfirm: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouterPush = jest.fn();
    mockRouterBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockRouterPush, back: mockRouterBack });
    (useParams as jest.Mock).mockReturnValue({ id: 'event-1' });

    // Mock window.confirm
    mockConfirm = jest.spyOn(window, 'confirm').mockImplementation(() => true);

    // Clear the mock functions
    mockEventDispatchFn.mockClear();
    mockUpdateEvent.mockClear();
    mockDeleteEvent.mockClear();
    mockAddExpense.mockClear();

    currentEventMockState = {
        events: [JSON.parse(JSON.stringify(mockEventInitial))],
        expenses: JSON.parse(JSON.stringify(mockExpenses)),
        users: JSON.parse(JSON.stringify(mockUsers)),
        settlements: [],
        currentUser: mockUsers[0],
        isDataLoaded: true,
        groups: [],
    };
  });

  afterEach(() => {
    // Restore window.confirm
    mockConfirm.mockRestore();
  });

  const renderComponent = () => {
    return render(<EventDetail />); 
  }
  
  test('renders event details correctly', () => {
    renderComponent();
    expect(screen.getByText(mockEventInitial.name)).toBeInTheDocument();
    expect(screen.getByText(mockEventInitial.description!)).toBeInTheDocument();
    expect(screen.getByText(new Date(mockEventInitial.startDate).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(mockEventInitial.endDate!).toLocaleDateString())).toBeInTheDocument();
  });
  
  test('allows editing event name and reflects change via dispatch', async () => {
    renderComponent(); 
    const eventNameDisplayElement = screen.getByText(mockEventInitial.name);
    fireEvent.click(eventNameDisplayElement);
    
    const inputField = await screen.findByRole('textbox');
    const updatedEventName = 'Updated Event Name';
    fireEvent.change(inputField, { target: { value: updatedEventName } });
    fireEvent.keyDown(inputField, { key: 'Enter', code: 'Enter' });
    
    expect(mockUpdateEvent).toHaveBeenCalledWith(mockEventInitial.id, { name: updatedEventName });
  });

  test('delete button calls deleteEvent and navigates', async () => {
    renderComponent();
    // Assuming delete button has variant 'danger' or a specific test ID
    const deleteButton = screen.getByTestId('button-danger'); 
    fireEvent.click(deleteButton);

    expect(mockDeleteEvent).toHaveBeenCalledWith(mockEventInitial.id);
    
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/events/list');
    });
  });

  test('shows "Event not found" message for invalid ID', () => {
    (useParams as jest.Mock).mockReturnValue({ id: 'invalid-event-id' });
    currentEventMockState.events = []; // No event with this ID
    renderComponent();
    expect(screen.getByText(/event not found/i)).toBeInTheDocument();
  });

  test('navigates to new expense page when "Add Expense" is clicked', () => {
    renderComponent();
    // Use the specific testId for the actions section Add Expense button
    const addExpenseButton = screen.getByTestId('add-expense-actions');
    fireEvent.click(addExpenseButton);
    expect(mockRouterPush).toHaveBeenCalledWith(`/expenses/new?eventId=${mockEventInitial.id}`);
  });
});
