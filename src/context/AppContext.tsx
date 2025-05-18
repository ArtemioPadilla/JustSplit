// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CURRENCY } from '../utils/currencyExchange';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Keep existing types and modify as needed
export interface User {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  preferredCurrency?: string;
  balance: number;
  avatarUrl?: string;
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
  notes?: string; // Detailed description/notes
  images?: string[]; // Array of image URLs
  splitMethod?: string; // 'equal', 'custom', 'percentage'
  participantShares?: { id: string; name: string; share: number; }[]; // For custom or percentage splits
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  participants: string[]; // User IDs
  expenses: string[]; // Expense IDs
  preferredCurrency?: string; // Preferred currency for the event
}

export interface Settlement {
  id: string;
  fromUser: string; // User ID
  toUser: string; // User ID
  amount: number;
  currency: string; // Currency code (e.g., 'USD', 'EUR')
  date: string;
  expenseIds: string[]; // Related Expense IDs
  eventId?: string; // Optional event ID
}

interface AppState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  settlements: Settlement[];
  isDataLoaded: boolean;
  currentUser: User | null; // Add currentUser to AppState
}

type Action = 
  | { type: 'ADD_USER'; payload: Omit<User, 'id' | 'balance'> }
  | { type: 'UPDATE_USER'; payload: { id: string, name: string, email?: string, phoneNumber?: string, preferredCurrency?: string, avatarUrl?: string } }
  | { type: 'ADD_EXPENSE'; payload: Omit<Expense, 'id'> }
  | { type: 'UPDATE_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'ADD_EVENT'; payload: Omit<Event, 'id' | 'expenses'> }
  | { type: 'UPDATE_EVENT'; payload: Event }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'ADD_SETTLEMENT'; payload: Omit<Settlement, 'id' | 'date'> }
  | { type: 'LOAD_DATA'; payload: AppState }
  | { type: 'SET_DATA_LOADED', payload: boolean }
  | { type: 'UPDATE_USERS', payload: User[] }
  | { type: 'UPDATE_EXPENSES', payload: Expense[] }
  | { type: 'UPDATE_EVENTS', payload: Event[] }
  | { type: 'UPDATE_SETTLEMENTS', payload: Settlement[] }
  | { type: 'SEND_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'ACCEPT_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'REJECT_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'REMOVE_FRIEND'; payload: { userId: string, friendId: string } }
  | { type: 'UPDATE_STATE'; payload: Partial<AppState> }; // New action for updating state


const initialState: AppState = {
  users: [],
  expenses: [],
  events: [],
  settlements: [],
  isDataLoaded: false,
  currentUser: null // Initialize currentUser as null
};

// Helper function to sanitize data before sending to Firestore
export const sanitizeForFirestore = (data: any): any => {
  if (!data) return null;
  
  // If it's an array, sanitize each element
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item));
  }
  
  // If it's an object, sanitize each property
  if (typeof data === 'object') {
    const sanitized: any = {};
    
    Object.entries(data).forEach(([key, value]) => {
      // Skip undefined values
      if (value !== undefined) {
        sanitized[key] = sanitizeForFirestore(value);
      }
    });
    
    return sanitized;
  }
  
  // Return primitive values as is
  return data;
};

// Modify the reducer to handle Firestore operations
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
      
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user => 
          user.id === action.payload.id
            ? { ...user, ...action.payload }
            : user
        ),
      };

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
      return { ...action.payload, isDataLoaded: true };
    case 'SET_DATA_LOADED':
      return { ...state, isDataLoaded: action.payload };
    // Replace direct state modifications with state updates after Firestore operations
    // Replace direct state modifications with state updates after Firestore operations
    case 'UPDATE_USERS':
      return { ...state, users: action.payload };
    case 'UPDATE_EXPENSES':
      return { ...state, expenses: action.payload };
    case 'UPDATE_EVENTS':
      return { ...state, events: action.payload };
    case 'UPDATE_SETTLEMENTS':
      return { ...state, settlements: action.payload };
    case 'SEND_FRIEND_REQUEST':
      return friendsReducer.sendFriendRequest(state, action.payload);
    case 'ACCEPT_FRIEND_REQUEST':
      return friendsReducer.acceptFriendRequest(state, action.payload);
    case 'REJECT_FRIEND_REQUEST':
      return friendsReducer.rejectFriendRequest(state, action.payload);
    case 'REMOVE_FRIEND':
      return friendsReducer.removeFriend(state, action.payload);
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  preferredCurrency: string;
  isConvertingCurrencies: boolean;
  setIsConvertingCurrencies: (value: boolean) => void;
  setPreferredCurrency: (currency: string) => void;
  // Add new Firestore operations
  addUser: (userData: Omit<User, 'id' | 'balance'>) => Promise<string>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
  addExpense: (expenseData: Omit<Expense, 'id'>) => Promise<string>;
  updateExpense: (expenseId: string, expenseData: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  addEvent: (eventData: Omit<Event, 'id' | 'expenses'>) => Promise<string>;
  updateEvent: (eventId: string, eventData: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  addSettlement: (settlementData: Omit<Settlement, 'id' | 'date'>) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isLoading: authLoading } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [preferredCurrency, setPreferredCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [isConvertingCurrencies, setIsConvertingCurrencies] = useState<boolean>(true);
  
  // Update state.currentUser when userProfile changes
  useEffect(() => {
    if (userProfile) {
      // Find existing user record or create one based on userProfile
      const currentUser: User = {
        id: userProfile.id,
        name: userProfile.name || 'Unknown User',
        email: userProfile.email,
        balance: 0,
        ...userProfile, // Spread any additional properties from userProfile
      };
      
      // Update the state with the current user
      dispatch({ 
        type: 'UPDATE_STATE', 
        payload: { currentUser } 
      });
      
      console.log('Current user updated in AppContext:', currentUser);
    } else if (!authLoading) {
      // If not loading and no profile, clear current user
      dispatch({ 
        type: 'UPDATE_STATE', 
        payload: { currentUser: null } 
      });
    }
  }, [userProfile, authLoading]);
  
  // Subscribe to Firestore collections
  useEffect(() => {
    if (authLoading || !userProfile) return;
    
    // Set up listeners for collections
    const unsubscribers: (() => void)[] = [];
    
    // Users collection listener
    const usersQuery = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
      dispatch({ type: 'UPDATE_USERS', payload: users });
    });
    unsubscribers.push(unsubUsers);
    
    // Expenses collection listener - only get expenses where the user is a participant
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('participants', 'array-contains', userProfile.id)
    );
    console.log('Setting up Firestore listener for expenses with userProfile.id:', userProfile.id);
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      console.log('Received expense data from Firestore:', snapshot.docs.length, 'documents');
      const expenses = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense));
      console.log('Mapped expense data:', expenses);
      dispatch({ type: 'UPDATE_EXPENSES', payload: expenses });
    }, (error) => {
      console.error('Error in expenses listener:', error);
    });
    unsubscribers.push(unsubExpenses);
    
    // Events collection listener - only get events where the user is a participant
    const eventsQuery = query(
      collection(db, 'events'),
      where('participants', 'array-contains', userProfile.id)
    );
    console.log('Setting up Firestore listener for events with userProfile.id:', userProfile.id);
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      console.log('Received event data from Firestore:', snapshot.docs.length, 'documents');
      const events = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
      console.log('Mapped event data:', events);
      dispatch({ type: 'UPDATE_EVENTS', payload: events });
    }, (error) => {
      console.error('Error in events listener:', error);
    });
    unsubscribers.push(unsubEvents);
    
    // Settlements collection listener - get settlements where the user is involved
    const settlementsQuery = query(
      collection(db, 'settlements'),
      where('fromUser', '==', userProfile.id)
    );
    const unsubSettlements = onSnapshot(settlementsQuery, (snapshot) => {
      const settlements = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Settlement));
      dispatch({ type: 'UPDATE_SETTLEMENTS', payload: settlements });
    });
    unsubscribers.push(unsubSettlements);
    
    // Set preferred currency from user profile
    if (userProfile.preferredCurrency) {
      setPreferredCurrency(userProfile.preferredCurrency);
    }
    
    // Mark data as loaded once initial data is fetched
    dispatch({ type: 'SET_DATA_LOADED', payload: true });
    
    // Clean up listeners on unmount
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userProfile, authLoading]);
  
  // Firestore operations
  const addUser = async (userData: Omit<User, 'id' | 'balance'>) => {
    const sanitizedData = sanitizeForFirestore({
      ...userData,
      balance: 0,
      createdAt: serverTimestamp()
    });
    
    const docRef = await addDoc(collection(db, 'users'), sanitizedData);
    return docRef.id;
  };
  
  const updateUser = async (userId: string, userData: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, sanitizeForFirestore(userData));
  };
  
  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    console.log('addExpense called with data:', expenseData);
    const sanitizedData = sanitizeForFirestore({
      ...expenseData,
      createdAt: serverTimestamp()
    });
    
    console.log('Calling Firestore addDoc for expense with sanitized data:', sanitizedData);
    const docRef = await addDoc(collection(db, 'expenses'), sanitizedData);
    console.log('Expense added to Firestore with ID:', docRef.id);
    
    // If there's an eventId, update the event with this expense
    if (expenseData.eventId) {
      console.log('Expense has eventId, updating event:', expenseData.eventId);
      const eventRef = doc(db, 'events', expenseData.eventId);
      await updateDoc(
        eventRef, 
        sanitizeForFirestore({
          expenses: [...(state.events.find(e => e.id === expenseData.eventId)?.expenses || []), docRef.id]
        })
      );
      console.log('Event updated with new expense');
    }
    
    return docRef.id;
  };

  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    const expenseRef = doc(db, 'expenses', expenseId);
    await updateDoc(expenseRef, sanitizeForFirestore(expenseData));
  };
  
  const deleteExpense = async (expenseId: string) => {
    // First, check if the expense is associated with an event
    const expense = state.expenses.find(e => e.id === expenseId);
    
    if (expense?.eventId) {
      // Update the event to remove this expense
      const eventRef = doc(db, 'events', expense.eventId);
      const event = state.events.find(e => e.id === expense.eventId);
      
      if (event) {
        await updateDoc(eventRef, {
          expenses: event.expenses.filter(id => id !== expenseId)
        });
      }
    }
    
    // Now delete the expense
    await deleteDoc(doc(db, 'expenses', expenseId));
  };
  
  const addEvent = async (eventData: Omit<Event, 'id' | 'expenses'>) => {
    console.log('addEvent called with data:', eventData);
    const sanitizedData = sanitizeForFirestore({
      ...eventData,
      expenses: [],
      createdAt: serverTimestamp()
    });
    
    console.log('Calling Firestore addDoc for event with sanitized data:', sanitizedData);
    const docRef = await addDoc(collection(db, 'events'), sanitizedData);
    console.log('Event added to Firestore with ID:', docRef.id);
    return docRef.id;
  };

  const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
    const eventRef = doc(db, 'events', eventId);
    await updateDoc(eventRef, sanitizeForFirestore(eventData));
  };
  
  const deleteEvent = async (eventId: string) => {
    // First, update any expenses associated with this event
    const batch = writeBatch(db);
    
    state.expenses.forEach(expense => {
      if (expense.eventId === eventId) {
        const expenseRef = doc(db, 'expenses', expense.id);
        batch.update(expenseRef, sanitizeForFirestore({ eventId: null }));
      }
    });
    
    // Commit the batch update
    await batch.commit();
    
    // Now delete the event
    await deleteDoc(doc(db, 'events', eventId));
  };
  
  const addSettlement = async (settlementData: Omit<Settlement, 'id' | 'date'>) => {
    // First, mark all the related expenses as settled
    const batch = writeBatch(db);
    
    settlementData.expenseIds.forEach(expenseId => {
      const expenseRef = doc(db, 'expenses', expenseId);
      batch.update(expenseRef, sanitizeForFirestore({ settled: true }));
    });

    const docRef = await addDoc(collection(db, 'settlements'), sanitizeForFirestore({
      ...settlementData,
      date: serverTimestamp()
    }));
    
    // Commit the batch update
    await batch.commit();
    
    return docRef.id;
  };

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      preferredCurrency,
      isConvertingCurrencies,
      setIsConvertingCurrencies,
      setPreferredCurrency,
      // Add new Firestore operations to the context
      addUser,
      updateUser,
      addExpense,
      updateExpense,
      deleteExpense,
      addEvent,
      updateEvent,
      deleteEvent,
      addSettlement
    }}>
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