import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Types based on data models
export interface User {
  id: string;
  name: string;
  email?: string;
  balance: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  paidBy: string; // User ID
  participants: string[]; // User IDs
  eventId?: string;
  settled: boolean;
}

export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  participants: string[]; // User IDs
  expenses: string[]; // Expense IDs
}

export interface Settlement {
  id: string;
  fromUser: string; // User ID
  toUser: string; // User ID
  amount: number;
  date: string;
  expenseIds: string[]; // Related Expense IDs
  eventId?: string; // Optional event ID
}

interface AppState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  settlements: Settlement[];
}

type Action =
  | { type: 'ADD_USER'; payload: Omit<User, 'id' | 'balance'> }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'id'> }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_EVENT'; payload: Omit<Event, 'id' | 'expenses'> }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_SETTLEMENT'; payload: Omit<Settlement, 'id' | 'date'> }
  | { type: 'LOAD_DATA'; payload: AppState };

const initialState: AppState = {
  users: [],
  expenses: [],
  events: [],
  settlements: [],
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_USER':
      const newUser: User = {
        id: uuidv4(),
        name: action.payload.name,
        email: action.payload.email,
        balance: 0,
      };
      return { ...state, users: [...state.users, newUser] };

    case 'ADD_EXPENSE':
      const newExpense: Expense = {
        id: uuidv4(),
        ...action.payload,
      };
      
      // Update event if expense is part of an event
      let updatedEvents = [...state.events];
      if (action.payload.eventId) {
        updatedEvents = state.events.map(event => 
          event.id === action.payload.eventId
            ? { ...event, expenses: [...event.expenses, newExpense.id] }
            : event
        );
      }
      
      return { 
        ...state, 
        expenses: [...state.expenses, newExpense],
        events: updatedEvents
      };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(expense => 
          expense.id === action.payload.id ? action.payload : expense
        ),
      };

    case 'DELETE_EXPENSE':
      // Remove expense from events
      const eventsWithoutExpense = state.events.map(event => ({
        ...event,
        expenses: event.expenses.filter(id => id !== action.payload),
      }));
      
      return {
        ...state,
        expenses: state.expenses.filter(expense => expense.id !== action.payload),
        events: eventsWithoutExpense,
      };

    case 'ADD_EVENT':
      const newEvent: Event = {
        id: uuidv4(),
        ...action.payload,
        expenses: [],
      };
      return { ...state, events: [...state.events, newEvent] };

    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map(event => 
          event.id === action.payload.id ? action.payload : event
        ),
      };

    case 'DELETE_EVENT':
      // We don't delete associated expenses, just remove their event association
      const expensesWithoutEvent = state.expenses.map(expense => 
        expense.eventId === action.payload
          ? { ...expense, eventId: undefined }
          : expense
      );
      
      return {
        ...state,
        events: state.events.filter(event => event.id !== action.payload),
        expenses: expensesWithoutEvent,
      };

    case 'ADD_SETTLEMENT':
      const newSettlement: Settlement = {
        id: uuidv4(),
        ...action.payload,
        date: new Date().toISOString(),
      };
      
      // Mark expenses as settled
      const expensesWithSettlement = state.expenses.map(expense => 
        action.payload.expenseIds.includes(expense.id)
          ? { ...expense, settled: true }
          : expense
      );
      
      return {
        ...state,
        settlements: [...state.settlements, newSettlement],
        expenses: expensesWithSettlement,
      };

    case 'LOAD_DATA':
      return action.payload;

    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load data from localStorage on initial render
  useEffect(() => {
    const savedData = localStorage.getItem('justSplitData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as AppState;
        dispatch({ type: 'LOAD_DATA', payload: parsedData });
      } catch (error) {
        console.error('Failed to parse saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('justSplitData', JSON.stringify(state));
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
