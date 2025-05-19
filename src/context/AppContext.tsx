// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CURRENCY } from '../utils/currencyExchange';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import friendsReducer from '../reducers/friendsReducer';
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
  friends?: string[];
  friendRequestsSent?: string[];
  friendRequestsReceived?: string[];
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

export interface Group {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  members: string[]; // User IDs
  eventIds: string[]; // Event IDs associated with this group
  expenseIds: string[]; // Expense IDs directly associated with this group
}

export interface AppState { // Add export here
  users: User[];
  expenses: Expense[];
  events: Event[];
  settlements: Settlement[];
  groups: Group[];
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
  | { type: 'UPDATE_GROUPS';      payload: Group[] } // <-- add
  | { type: 'SEND_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'ACCEPT_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'REJECT_FRIEND_REQUEST'; payload: { from: string, to: string } }
  | { type: 'REMOVE_FRIEND'; payload: { userId: string, friendId: string } }
  | { type: 'ADD_GROUP'; payload: Partial<Group> }
  | { type: 'UPDATE_GROUP'; payload: Group }
  | { type: 'DELETE_GROUP'; payload: string }
  | { type: 'ADD_EVENT_TO_GROUP'; payload: { groupId: string; eventId: string } }
  | { type: 'ADD_EXPENSE_TO_GROUP'; payload: { groupId: string; expenseId: string } }
  | { type: 'ADD_MEMBER_TO_GROUP'; payload: { groupId: string; userId: string } }
  | { type: 'REMOVE_EVENT_FROM_GROUP'; payload: { groupId: string; eventId: string } }
  | { type: 'REMOVE_EXPENSE_FROM_GROUP'; payload: { groupId: string; expenseId: string } }
  | { type: 'REMOVE_MEMBER_FROM_GROUP'; payload: { groupId: string; userId: string } }
  | { type: 'UPDATE_STATE'; payload: Partial<AppState> }; // New action for updating state


const initialState: AppState = {
  users: [],
  expenses: [],
  events: [],
  settlements: [],
  groups: [],
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
    case 'UPDATE_GROUPS': // <-- add
      return { ...state, groups: action.payload };
    case 'SEND_FRIEND_REQUEST':
      return friendsReducer.sendFriendRequest(state, action.payload);
    case 'ACCEPT_FRIEND_REQUEST':
      return friendsReducer.acceptFriendRequest(state, action.payload);
    case 'REJECT_FRIEND_REQUEST':
      return friendsReducer.rejectFriendRequest(state, action.payload);
    case 'REMOVE_FRIEND':
      return friendsReducer.removeFriend(state, action.payload);
    case 'ADD_GROUP':
      const newGroup: Group = {
        id: uuidv4(),
        name: action.payload.name || 'Untitled Group',
        description: action.payload.description || '',
        createdAt: new Date().toISOString(),
        members: action.payload.members || [],
        eventIds: action.payload.eventIds || [],
        expenseIds: action.payload.expenseIds || [],
      };
      return {
        ...state,
        groups: [...state.groups, newGroup],
      };
      
    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.id ? action.payload : group
        ),
      };
      
    case 'DELETE_GROUP':
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload),
      };
      
    case 'ADD_EVENT_TO_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              eventIds: [...new Set([...group.eventIds, action.payload.eventId])],
            };
          }
          return group;
        }),
      };
      
    case 'ADD_EXPENSE_TO_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              expenseIds: [...new Set([...group.expenseIds, action.payload.expenseId])],
            };
          }
          return group;
        }),
      };
      
    case 'ADD_MEMBER_TO_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              members: [...new Set([...group.members, action.payload.userId])],
            };
          }
          return group;
        }),
      };
      
    case 'REMOVE_EVENT_FROM_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              eventIds: group.eventIds.filter(id => id !== action.payload.eventId),
            };
          }
          return group;
        }),
      };
      
    case 'REMOVE_EXPENSE_FROM_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              expenseIds: group.expenseIds.filter(id => id !== action.payload.expenseId),
            };
          }
          return group;
        }),
      };
      
    case 'REMOVE_MEMBER_FROM_GROUP':
      return {
        ...state,
        groups: state.groups.map(group => {
          if (group.id === action.payload.groupId) {
            return {
              ...group,
              members: group.members.filter(id => id !== action.payload.userId),
            };
          }
          return group;
        }),
      };
      
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
  // Remove setIsConvertingCurrencies since we won't need to toggle it
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
  addGroup: (groupData: Partial<Group>) => Promise<string>;
  updateGroup: (groupId: string, groupData: Partial<Group>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Allow initialState to be passed in for testing
export const AppProvider: React.FC<{ children: React.ReactNode, initialState?: Partial<AppState> }> = ({ children, initialState: customInitialState }) => {
  // Get auth context, but handle case where it might be missing (for tests)
  let auth;
  try {
    auth = useAuth();
  } catch (e) {
    // If AuthContext is not available, use dummy values
    auth = {
      currentUser: null,
      userProfile: null, // Added for consistency
      isLoading: false,
      // Ensure other properties of AuthContextValue are mocked if accessed
      // e.g., login: async () => {}, logout: async () => {}, etc.
    };
  }

  // Always provide a fallback for initialState
  const [state, dispatch] = useReducer(
    reducer,
    { ...initialState, ...customInitialState }
  );

  const [preferredCurrency, setPreferredCurrency] = useState<string>(DEFAULT_CURRENCY);
  // Set isConvertingCurrencies to true by default, remove toggle functionality
  const isConvertingCurrencies = true;
  
  // Update state.currentUser when auth state changes (userProfile or currentUser)
  useEffect(() => {
    if (auth.isLoading) {
      // Optional: dispatch a loading state for currentUser if your UI needs to react to this
      return; // Wait for auth to finish loading
    }

    if (auth.userProfile) {
      const profile = auth.userProfile;
      const currentUserData: User = {
        id: profile.id,
        name: profile.name || 'Unknown User',
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        preferredCurrency: profile.preferredCurrency || DEFAULT_CURRENCY,
        balance: profile.balance ?? 0,
        phoneNumber: profile.phoneNumber, 
        friends: profile.friends || [], 
        friendRequestsSent: profile.friendRequestsSent || [], 
        friendRequestsReceived: profile.friendRequestsReceived || [], 
      };
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: currentUserData } });
      if (currentUserData.preferredCurrency) {
        setPreferredCurrency(currentUserData.preferredCurrency);
      }
    } else if (auth.currentUser) {
      const fbUser = auth.currentUser;
      const existingUserInState = state.users.find(u => u.id === fbUser.uid);

      const currentUserData: User = {
        id: fbUser.uid,
        name: existingUserInState?.name || fbUser.displayName || 'Unknown User',
        email: existingUserInState?.email || fbUser.email || undefined,
        avatarUrl: existingUserInState?.avatarUrl || fbUser.photoURL || undefined,
        preferredCurrency: existingUserInState?.preferredCurrency || DEFAULT_CURRENCY,
        balance: existingUserInState?.balance ?? 0,
        phoneNumber: existingUserInState?.phoneNumber,
        friends: existingUserInState?.friends || [],
        friendRequestsSent: existingUserInState?.friendRequestsSent || [],
        friendRequestsReceived: existingUserInState?.friendRequestsReceived || [],
      };
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: currentUserData } });
      if (currentUserData.preferredCurrency) {
        setPreferredCurrency(currentUserData.preferredCurrency);
      }
    } else {
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: null } });
      setPreferredCurrency(DEFAULT_CURRENCY);
    }
  }, [auth.isLoading, auth.userProfile, auth.currentUser, dispatch, state.users]);
  
  // Subscribe to Firestore collections
  useEffect(() => {
    if (auth.isLoading) {
      return; // Wait for auth to finish loading
    }

    // Placeholder for unsubscribe functions
    let unsubscribers: (() => void)[] = [];

    if (state.currentUser && state.currentUser.id) {
      const userId = state.currentUser.id;

      // NOTE: Replace the following with your actual Firestore listener setup logic.
      // The key changes are the trigger condition (userId) and dependency array.

      // Example: Users collection listener
      const usersQuery = collection(db, "users");
      unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        dispatch({ type: 'UPDATE_USERS', payload: usersData });
      }, (error) => console.error("Error fetching users:", error)));

      // Example: Events listener (e.g., events where current user is a participant)
      // Modify query as per your data model (e.g., 'participants', 'members', 'userIds' etc.)
      const eventsQuery = query(collection(db, "events"), where("participants", "array-contains", userId));
      unsubscribers.push(onSnapshot(eventsQuery, (snapshot) => {
        const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        dispatch({ type: 'UPDATE_EVENTS', payload: eventsData });
      }, (error) => console.error("Error fetching events:", error)));
      
      // Example: Expenses listener (e.g., expenses paid by or involving the current user)
      // Modify query as per your data model
      const expensesQuery = query(collection(db, "expenses"), where("paidBy", "==", userId)); // Or another relevant field
      unsubscribers.push(onSnapshot(expensesQuery, (snapshot) => {
        const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        dispatch({ type: 'UPDATE_EXPENSES', payload: expensesData });
      }, (error) => console.error("Error fetching expenses:", error)));

      // Example: Settlements listener
      const settlementsQuery = query(
        collection(db, "settlements"),
        where("involvedUsers", "array-contains", userId)
      );
      unsubscribers.push(onSnapshot(settlementsQuery, (snapshot) => {
        const settlementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Settlement));
        dispatch({ type: 'UPDATE_SETTLEMENTS', payload: settlementsData });
      }, (error) => console.error("Error fetching settlements:", error)));
      
      // <-- NEW: subscribe to groups where currentUser is a member
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", userId)
      );
      unsubscribers.push(onSnapshot(groupsQuery, (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        dispatch({ type: 'UPDATE_GROUPS', payload: groupsData });
      }, (error) => console.error("Error fetching groups:", error)));

      dispatch({ type: 'SET_DATA_LOADED', payload: true });
    } else if (!auth.currentUser && !auth.isLoading) {
      // User is logged out, clear data only if not using customInitialState
      if (customInitialState === undefined) { 
        dispatch({ type: 'LOAD_DATA', payload: { ...initialState, currentUser: null, isDataLoaded: false } });
        // Explicitly clear collections
        dispatch({ type: 'UPDATE_USERS', payload: [] });
        dispatch({ type: 'UPDATE_EVENTS', payload: [] });
        dispatch({ type: 'UPDATE_EXPENSES', payload: [] });
        dispatch({ type: 'UPDATE_SETTLEMENTS', payload: [] });
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  // MODIFIED: Add customInitialState to the dependency array
  }, [state.currentUser?.id, auth.currentUser, auth.isLoading, dispatch, customInitialState]); 

  // Firestore operations (addUser, updateUser, etc.)
  // These should remain largely the same but ensure they use sanitized data
  // and handle errors appropriately.

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

  const addGroup = async (groupData: Partial<Group>) => {
    const sanitizedData = sanitizeForFirestore({
      ...groupData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    const docRef = await addDoc(collection(db, 'groups'), sanitizedData);
    return docRef.id;
  };
  
  const updateGroup = async (groupId: string, groupData: Partial<Group>) => {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, sanitizeForFirestore({
      ...groupData,
      updatedAt: serverTimestamp(),
    }));
  };
  
  const deleteGroup = async (groupId: string) => {
    await deleteDoc(doc(db, 'groups', groupId));
  };

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      preferredCurrency,
      isConvertingCurrencies,
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
      addSettlement,
      addGroup,
      updateGroup,
      deleteGroup,
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