// src/context/AppContext.tsx
import React, { createContext, useContext, useReducer, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_CURRENCY } from '../utils/currencyExchange';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import friendsReducer from '../reducers/friendsReducer';
import {
  User,
  Expense,
  Event,
  Settlement,
  Group
} from '../types';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';

// Use the imported interfaces instead of redefining them

export interface AppState {
  users: User[];
  expenses: Expense[];
  events: Event[];
  settlements: Settlement[];
  groups: Group[];
  isDataLoaded: boolean;
  currentUser: User | null;
}

export type Action = 
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
export const sanitizeForFirestore = (data: Record<string, unknown>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Skip undefined values but allow null values
    if (value !== undefined) {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
};

// Add type for Firestore data
interface FirestoreExpense {
  description: string;
  amount: number;
  currency: string;
  paidBy: string;
  participants: string[];
  date: Timestamp | string;
  createdAt: Timestamp | string;
  eventId?: string;
  groupId?: string;
  settled?: boolean;
}

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
            ? { ...event, expenseIds: [...(event.expenseIds || []), newExpense.id] }
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
        expenseIds: (event.expenseIds || []).filter(id => id !== action.payload),
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
        expenseIds: [],
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
  setPreferredCurrency: (currency: string) => void; // Added this line
  isConvertingCurrencies: boolean;
  // Remove setIsConvertingCurrencies since we won\'t need to toggle it
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
  // Add missing group management functions
  addEventToGroup: (groupId: string, eventId: string) => Promise<void>;
  addExpenseToGroup: (groupId: string, expenseId: string) => Promise<void>;
  addMemberToGroup: (groupId: string, userId: string) => Promise<void>;
  removeEventFromGroup: (groupId: string, eventId: string) => Promise<void>;
  removeExpenseFromGroup: (groupId: string, expenseId: string) => Promise<void>;
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

// Allow initialState to be passed in for testing
export const AppProvider: React.FC<{ children: React.ReactNode, initialState?: Partial<AppState> }> = ({ children, initialState: customInitialState }) => {
  const auth = useAuth();
  const dummyAuth = {
    currentUser: null,
    userProfile: null,
    isLoading: false,
    login: async () => ({ user: null }),
    logout: async () => {},
    updateProfile: async () => {},
    deleteAccount: async () => {},
  };

  const effectiveAuth = auth || dummyAuth;

  // Merge custom initial state with defaults, ensuring all required fields are present
  const mergedInitialState: AppState = {
    users: customInitialState?.users || [],
    expenses: customInitialState?.expenses || [],
    events: customInitialState?.events || [],
    settlements: customInitialState?.settlements || [],
    groups: customInitialState?.groups || [],
    isDataLoaded: customInitialState?.isDataLoaded ?? false,
    currentUser: customInitialState?.currentUser ?? null,
  };

  const [state, dispatch] = useReducer(reducer, mergedInitialState);

  const [preferredCurrency, setPreferredCurrency] = useState<string>(DEFAULT_CURRENCY);
  const isConvertingCurrencies = true;
  
  // Update state.currentUser when auth state changes (userProfile or currentUser)
  useEffect(() => {
    // Skip auth effects in test environment to prevent state interference
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    if (isTestEnv) {
      return;
    }

    if (effectiveAuth.isLoading) {
      return; // Wait for auth to finish loading
    }

    if (effectiveAuth.userProfile) {
      const profile = effectiveAuth.userProfile;
      const currentUserData: Partial<User> = {
        id: profile.id,
        name: profile.name || 'Unknown User',
        preferredCurrency: profile.preferredCurrency || DEFAULT_CURRENCY,
        balance: profile.balance ?? 0,
        phoneNumber: profile.phoneNumber, 
        friends: profile.friends || [], 
        friendRequestsSent: profile.friendRequestsSent || [], 
        friendRequestsReceived: profile.friendRequestsReceived || [], 
      };
      
      // Only add optional fields if they have actual values
      if (profile.email) {
        currentUserData.email = profile.email;
      }
      if (profile.avatarUrl) {
        currentUserData.avatarUrl = profile.avatarUrl;
      }
      
      // Cast to User since we know required fields are present
      const finalUserData = currentUserData as User;
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: finalUserData } });
      if (finalUserData.preferredCurrency) {
        setPreferredCurrency(finalUserData.preferredCurrency);
      }
    } else if (effectiveAuth.currentUser) {
      const fbUser = effectiveAuth.currentUser;
      const existingUserInState = state.users.find(u => u.id === fbUser.uid);

      const currentUserData: Partial<User> = {
        id: fbUser.uid,
        name: existingUserInState?.name || fbUser.displayName || 'Unknown User',
        preferredCurrency: existingUserInState?.preferredCurrency || DEFAULT_CURRENCY,
        balance: existingUserInState?.balance ?? 0,
        phoneNumber: existingUserInState?.phoneNumber,
        friends: existingUserInState?.friends || [],
        friendRequestsSent: existingUserInState?.friendRequestsSent || [],
        friendRequestsReceived: existingUserInState?.friendRequestsReceived || [],
      };
      
      // Only add optional fields if they have actual values
      if (existingUserInState?.email || fbUser.email) {
        currentUserData.email = existingUserInState?.email || fbUser.email!;
      }
      if (existingUserInState?.avatarUrl || fbUser.photoURL) {
        currentUserData.avatarUrl = existingUserInState?.avatarUrl || fbUser.photoURL!;
      }
      
      // Cast to User since we know required fields are present
      const finalUserData = currentUserData as User;
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: finalUserData } });
      if (finalUserData.preferredCurrency) {
        setPreferredCurrency(finalUserData.preferredCurrency);
      }
    } else {
      dispatch({ type: 'UPDATE_STATE', payload: { currentUser: null } });
      setPreferredCurrency(DEFAULT_CURRENCY);
    }
  }, [effectiveAuth.isLoading, effectiveAuth.userProfile, effectiveAuth.currentUser, state.users]);
  
  // Subscribe to Firestore collections
  useEffect(() => {
    // Skip Firebase listeners in test environment
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    if (isTestEnv) {
      console.log('Skipping Firebase listeners in test environment');
      dispatch({ type: 'SET_DATA_LOADED', payload: true });
      return;
    }

    if (effectiveAuth.isLoading) {
      return; // Wait for auth to finish loading
    }

    const unsubscribers: (() => void)[] = [];

    if (state.currentUser?.id) {
      const userId = state.currentUser.id;
      console.log('Setting up Firestore listeners for user:', userId);

      try {
        // Users collection - Subscribe to all users
        const usersQuery = collection(db, "users");
        unsubscribers.push(onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          console.log('Users data updated:', usersData.length, 'users');
          dispatch({ type: 'UPDATE_USERS', payload: usersData });
        }, (error) => console.error("Error fetching users:", error)));

        // Events where the current user is a participant
        const eventsQuery = query(
          collection(db, "events"), 
          where("participants", "array-contains", userId)
        );
        unsubscribers.push(onSnapshot(eventsQuery, (snapshot) => {
          const eventsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id,
              ...data,
              startDate: data.startDate instanceof Timestamp ? 
                data.startDate.toDate().toISOString() : data.startDate,
              endDate: data.endDate instanceof Timestamp ? 
                data.endDate.toDate().toISOString() : data.endDate,
              createdAt: data.createdAt instanceof Timestamp ? 
                data.createdAt.toDate().toISOString() : data.createdAt,
            } as Event;
          });
          console.log('Events data updated:', eventsData.length, 'events');
          dispatch({ type: 'UPDATE_EVENTS', payload: eventsData });
        }, (error) => console.error("Error fetching events:", error)));
        
        // Expenses involving the current user
        const expensesQuery = query(
          collection(db, "expenses"),
          where("participants", "array-contains", userId)
        );
        unsubscribers.push(onSnapshot(expensesQuery, (snapshot) => {
          const expensesData = snapshot.docs.map(doc => {
            const data = doc.data() as Omit<FirestoreExpense, 'id'>;
            return {
              id: doc.id,
              ...data,
              date: data.date instanceof Timestamp ? 
                data.date.toDate().toISOString() : data.date,
              createdAt: data.createdAt instanceof Timestamp ? 
                data.createdAt.toDate().toISOString() : data.createdAt,
            } as Expense;
          });
          console.log('Expenses data updated:', expensesData.length, 'expenses');
          dispatch({ type: 'UPDATE_EXPENSES', payload: expensesData });
        }, (error) => console.error("Error fetching expenses:", error)));

        // Settlements involving the current user
        const settlementsQuery = query(
          collection(db, "settlements"),
          where("involvedUsers", "array-contains", userId)
        );
        unsubscribers.push(onSnapshot(settlementsQuery, (snapshot) => {
          const settlementsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id,
              ...data,
              date: data.date instanceof Timestamp ? 
                data.date.toDate().toISOString() : data.date,
            } as Settlement;
          });
          console.log('Settlements data updated:', settlementsData.length, 'settlements');
          dispatch({ type: 'UPDATE_SETTLEMENTS', payload: settlementsData });
        }, (error) => console.error("Error fetching settlements:", error)));
        
        // Groups where the current user is a member
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", userId)
        );
        unsubscribers.push(onSnapshot(groupsQuery, (snapshot) => {
          const groupsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id,
              ...data,
              createdAt: data.createdAt instanceof Timestamp ? 
                data.createdAt.toDate().toISOString() : data.createdAt,
              updatedAt: data.updatedAt instanceof Timestamp ? 
                data.updatedAt.toDate().toISOString() : data.updatedAt,
            } as Group;
          });
          console.log('Groups data updated:', groupsData.length, 'groups');
          dispatch({ type: 'UPDATE_GROUPS', payload: groupsData });
        }, (error) => console.error("Error fetching groups:", error)));

        dispatch({ type: 'SET_DATA_LOADED', payload: true });
      } catch (error) {
        console.error('Error setting up Firestore listeners:', error);
        dispatch({ type: 'SET_DATA_LOADED', payload: false });
      }
    } else if (!effectiveAuth.currentUser && !effectiveAuth.isLoading && !customInitialState) {
      // Skip state clearing in test environment
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
      if (!isTestEnv) {
        console.log('User is logged out, clearing state data');
        dispatch({ type: 'LOAD_DATA', payload: { ...initialState, currentUser: null, isDataLoaded: false } });
      }
    }

    return () => {
      console.log('Cleaning up Firestore listeners');
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (error) {
          console.error('Error unsubscribing from Firestore listener:', error);
        }
      });
    };
  }, [state.currentUser?.id, effectiveAuth.currentUser, effectiveAuth.isLoading, customInitialState]);
  
  // Firestore operations (addUser, updateUser, etc.)
  // These should remain largely the same but ensure they use sanitized data
  // and handle errors appropriately.

  const addUser = async (userData: Omit<User, 'id' | 'balance'>) => {
    const dataToSave = {
      ...userData,
      balance: 0,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'users'), dataToSave);
    return docRef.id;
  };
  
  const updateUser = async (userId: string, userData: Partial<User>) => {
    const userRef = doc(db, 'users', userId);
    const sanitizedData = Object.entries(userData).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});
    await updateDoc(userRef, sanitizedData);
  };
  
  const addExpense = async (expenseData: Omit<Expense, 'id'>) => {
    console.log('addExpense called with data:', expenseData);
    const dataToSave = {
      ...expenseData,
      createdAt: serverTimestamp()
    };
    
    console.log('Calling Firestore addDoc for expense with data:', dataToSave);
    const docRef = await addDoc(collection(db, 'expenses'), dataToSave);
    console.log('Expense added to Firestore with ID:', docRef.id);
    
    // If there's an eventId, update the event with this expense
    if (expenseData.eventId) {
      console.log('Expense has eventId, updating event:', expenseData.eventId);
      const eventRef = doc(db, 'events', expenseData.eventId);
      await updateDoc(
        eventRef, 
        {
          expenseIds: [...(state.events.find(e => e.id === expenseData.eventId)?.expenseIds || []), docRef.id]
        }
      );
      console.log('Event updated with new expense');
    }
    
    return docRef.id;
  };

  const updateExpense = async (expenseId: string, expenseData: Partial<Expense>) => {
    const expenseRef = doc(db, 'expenses', expenseId);
    const sanitizedData = Object.entries(expenseData).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});
    await updateDoc(expenseRef, sanitizedData);
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
          expenseIds: (event.expenseIds || []).filter(id => id !== expenseId)
        });
      }
    }
    
    // Now delete the expense
    await deleteDoc(doc(db, 'expenses', expenseId));
  };
  
  const addEvent = async (eventData: Omit<Event, 'id' | 'expenses'>) => {
    console.log('addEvent called with data:', eventData);
    const dataToSave = {
      ...eventData,
      expenses: [],
      createdAt: serverTimestamp()
    };
    
    console.log('Calling Firestore addDoc for event with data:', dataToSave);
    const docRef = await addDoc(collection(db, 'events'), dataToSave);
    console.log('Event added to Firestore with ID:', docRef.id);
    return docRef.id;
  };

  const updateEvent = async (eventId: string, eventData: Partial<Event>) => {
    const eventRef = doc(db, 'events', eventId);
    const sanitizedData = Object.entries(eventData).reduce<Record<string, any>>((acc, [key, value]) => {
      if (value !== undefined) acc[key] = value;
      return acc;
    }, {});
    await updateDoc(eventRef, sanitizedData);
  };
  
  const deleteEvent = async (eventId: string) => {
    // First, update any expenses associated with this event
    const batch = writeBatch(db);
    
    state.expenses.forEach(expense => {
      if (expense.eventId === eventId) {
        const expenseRef = doc(db, 'expenses', expense.id);
        batch.update(expenseRef, { eventId: null });
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
      batch.update(expenseRef, { settled: true });
    });

    const docRef = await addDoc(collection(db, 'settlements'), {
      ...settlementData,
      date: serverTimestamp()
    });
    
    // Commit the batch update
    await batch.commit();
    
    return docRef.id;
  };

  // Update the addGroup function to handle state updates more consistently
  const addGroup = async (groupData: Partial<Group>) => {
    try {
      // Create a complete group object with defaults
      const groupToAdd = {
        name: groupData.name || 'Untitled Group',
        description: groupData.description || '',
        members: groupData.members || [],
        eventIds: groupData.eventIds || [],
        expenseIds: groupData.expenseIds || [],
        ...groupData
      };
      
      // Sanitize the data before sending to Firestore
      const sanitizedData = {
        ...groupToAdd,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Create the group in Firestore
      const docRef = await addDoc(collection(db, 'groups'), sanitizedData);
      
      // Note: Don't dispatch here as the onSnapshot listener will handle the state update
      // This prevents duplicate state updates and ensures consistency with Firestore
      
      return docRef.id;
    } catch (error) {
      console.error("Error adding group:", error);
      throw error;
    }
  };
  
  const updateGroup = async (groupId: string, groupData: Partial<Group>) => {
    try {
      const groupRef = doc(db, 'groups', groupId);
      const sanitizedDataForUpdate = Object.entries(groupData).reduce<Record<string, any>>((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
      }, {});
      sanitizedDataForUpdate.updatedAt = serverTimestamp();
      await updateDoc(groupRef, sanitizedDataForUpdate);
    } catch (error) {
      console.error("Error updating group:", error);
      throw error;
    }
  };
  
  const deleteGroup = async (groupId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Use a batch to update all associated entities
      const batch = writeBatch(db);
      
      // Update all events that are part of this group
      for (const eventId of group.eventIds) {
        const event = state.events.find(e => e.id === eventId);
        if (event && event.groupId === groupId) {
          const eventRef = doc(db, 'events', eventId);
          batch.update(eventRef, {
            groupId: null,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Update all expenses that are part of this group
      for (const expenseId of group.expenseIds) {
        const expense = state.expenses.find(e => e.id === expenseId);
        if (expense && expense.groupId === groupId) {
          const expenseRef = doc(db, 'expenses', expenseId);
          batch.update(expenseRef, {
            groupId: null,
            updatedAt: serverTimestamp()
          });
        }
      }
      
      // Delete the group
      const groupRef = doc(db, 'groups', groupId);
      batch.delete(groupRef);
      
      // Commit all the updates
      await batch.commit();
      
      // Note: onSnapshot listeners will handle the state updates
    } catch (error) {
      console.error("Error deleting group:", error);
      throw error;
    }
  };
  
  // Implement the group management functions with better error handling
  const addEventToGroup = async (groupId: string, eventId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      const event = state.events.find(e => e.id === eventId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      if (!event) {
        throw new Error(`Event with ID ${eventId} not found`);
      }
      
      // Check if event is already in the group
      if (group.eventIds.includes(eventId)) {
        console.log(`Event ${eventId} is already in group ${groupId}`);
        return;
      }
      
      const batch = writeBatch(db);
      
      // Ensure we don't duplicate the event in the array
      const updatedEventIds = [...new Set([...group.eventIds, eventId])];
      
      // Update group with the new event
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, {
        eventIds: updatedEventIds,
        updatedAt: serverTimestamp(),
      });
      
      // Update the event to reference this group
      const eventRef = doc(db, 'events', eventId);
      batch.update(eventRef, {
        groupId: groupId,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Note: onSnapshot listeners will handle the state updates
    } catch (error) {
      console.error("Error adding event to group:", error);
      throw error;
    }
  };

  const addExpenseToGroup = async (groupId: string, expenseId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      const expense = state.expenses.find(e => e.id === expenseId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      if (!expense) {
        throw new Error(`Expense with ID ${expenseId} not found`);
      }
      
      // Check if expense is already in the group
      if (group.expenseIds.includes(expenseId)) {
        console.log(`Expense ${expenseId} is already in group ${groupId}`);
        return;
      }
      
      const batch = writeBatch(db);
      
      // Ensure we don't duplicate the expense in the array
      const updatedExpenseIds = [...new Set([...group.expenseIds, expenseId])];
      
      // Update group with the new expense
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, {
        expenseIds: updatedExpenseIds,
        updatedAt: serverTimestamp(),
      });
      
      // Update the expense to reference this group
      const expenseRef = doc(db, 'expenses', expenseId);
      batch.update(expenseRef, {
        groupId: groupId,
        updatedAt: serverTimestamp(),
      });
      
      await batch.commit();
      
      // Note: onSnapshot listeners will handle the state updates
    } catch (error) {
      console.error("Error adding expense to group:", error);
      throw error;
    }
  };
  
  const addMemberToGroup = async (groupId: string, userId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      const user = state.users.find(u => u.id === userId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Check if user is already a member
      if (group.members.includes(userId)) {
        console.log(`User ${userId} is already a member of group ${groupId}`);
        return;
      }
      
      // Ensure we don't duplicate the member in the array
      const updatedMembers = [...new Set([...group.members, userId])];
      
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, sanitizeForFirestore({
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      }));
      
      // Note: onSnapshot listener will handle the state update
    } catch (error) {
      console.error("Error adding member to group:", error);
      throw error;
    }
  };
  
  const removeEventFromGroup = async (groupId: string, eventId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Check if event is actually in the group
      if (!group.eventIds.includes(eventId)) {
        console.log(`Event ${eventId} is not in group ${groupId}`);
        return;
      }
      
      const updatedEventIds = group.eventIds.filter(id => id !== eventId);
      
      // Use batch to update both group and event
      const batch = writeBatch(db);
      
      // Update group to remove event
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, {
        eventIds: updatedEventIds,
        updatedAt: serverTimestamp(),
      });
      
      // Update the event to remove group association if it belongs to this group
      const event = state.events.find(e => e.id === eventId);
      if (event && event.groupId === groupId) {
        const eventRef = doc(db, 'events', eventId);
        batch.update(eventRef, {
          groupId: null,
          updatedAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      // Note: onSnapshot listeners will handle the state updates
    } catch (error) {
      console.error("Error removing event from group:", error);
      throw error;
    }
  };
  
  const removeExpenseFromGroup = async (groupId: string, expenseId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      // Check if expense is actually in the group
      if (!group.expenseIds.includes(expenseId)) {
        console.log(`Expense ${expenseId} is not in group ${groupId}`);
        return;
      }
      
      const updatedExpenseIds = group.expenseIds.filter(id => id !== expenseId);
      
      // Use batch to update both the group and expense
      const batch = writeBatch(db);
      
      // Update group to remove expense
      const groupRef = doc(db, 'groups', groupId);
      batch.update(groupRef, {
        expenseIds: updatedExpenseIds,
        updatedAt: serverTimestamp(),
      });
      
      // Update the expense to remove group association if it belongs to this group
      const expense = state.expenses.find(e => e.id === expenseId);
      if (expense && expense.groupId === groupId) {
        const expenseRef = doc(db, 'expenses', expenseId);
        batch.update(expenseRef, {
          groupId: null,
          updatedAt: serverTimestamp(),
        });
      }
      
      await batch.commit();
      
      // Note: onSnapshot listeners will handle the state updates
    } catch (error) {
      console.error("Error removing expense from group:", error);
      throw error;
    }
  };
  
  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    try {
      const group = state.groups.find(g => g.id === groupId);
      
      if (!group) {
        throw new Error(`Group with ID ${groupId} not found`);
      }
      
      if (!group.members.includes(userId)) {
        console.log(`User ${userId} is not a member of group ${groupId}`);
        return;
      }
      
      const updatedMembers = group.members.filter(id => id !== userId);
      
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, sanitizeForFirestore({
        members: updatedMembers,
        updatedAt: serverTimestamp(),
      }));
      
    } catch (error) {
      console.error("Error removing member from group:", error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      preferredCurrency,
      setPreferredCurrency,
      isConvertingCurrencies,
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
      addEventToGroup,
      addExpenseToGroup,
      addMemberToGroup,
      removeEventFromGroup,
      removeExpenseFromGroup,
      removeMemberFromGroup,
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