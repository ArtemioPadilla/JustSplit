import React from 'react';
import { render, act } from '@testing-library/react';
import { AppProvider, useAppContext } from '../AppContext';

// Custom renderHook utility
function renderHook(callback, { wrapper: Wrapper } = {}) {
  const result = { current: null };
  
  function TestComponent() {
    result.current = callback();
    return null;
  }
  
  render(
    Wrapper ? <Wrapper><TestComponent /></Wrapper> : <TestComponent />
  );
  
  return { result };
}

describe('Settlement Currency Functionality', () => {
  test('settlement includes currency when created', () => {
    // Set up initial state with users
    const initialState = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        }
      ],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Add a settlement
    act(() => {
      result.current.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 50,
          currency: 'EUR',
          expenseIds: ['exp1']
        }
      });
    });
    
    // Check that settlement was created with correct currency
    expect(result.current.state.settlements.length).toBe(1);
    expect(result.current.state.settlements[0].amount).toBe(50);
    expect(result.current.state.settlements[0].currency).toBe('EUR');
  });
  
  test('marks expenses as settled when settlement is created', () => {
    // Set up initial state with an expense
    const initialState = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Dinner',
          amount: 80,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        }
      ],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Verify expense is not settled initially
    expect(result.current.state.expenses[0].settled).toBe(false);
    
    // Add a settlement that references the expense
    act(() => {
      result.current.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 40,
          currency: 'USD',
          expenseIds: ['exp1']
        }
      });
    });
    
    // Check that expense is now marked as settled
    expect(result.current.state.expenses[0].settled).toBe(true);
  });
  
  test('supports settlements in different currencies', () => {
    // Set up initial state with expenses in different currencies
    const initialState = {
      users: [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ],
      expenses: [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        },
        {
          id: 'exp2',
          description: 'Dinner',
          amount: 80,
          currency: 'EUR',
          date: '2023-01-02',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        }
      ],
      events: [],
      settlements: []
    };
    
    const wrapper = ({ children }) => (
      <AppProvider initialState={initialState}>{children}</AppProvider>
    );
    
    const { result } = renderHook(() => useAppContext(), { wrapper });
    
    // Add settlements in different currencies
    act(() => {
      // USD settlement
      result.current.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 50,
          currency: 'USD',
          expenseIds: ['exp1']
        }
      });
      
      // EUR settlement
      result.current.dispatch({
        type: 'ADD_SETTLEMENT',
        payload: {
          fromUser: 'user2',
          toUser: 'user1',
          amount: 40,
          currency: 'EUR',
          expenseIds: ['exp2']
        }
      });
    });
    
    // Check that settlements were created with correct currencies
    expect(result.current.state.settlements.length).toBe(2);
    expect(result.current.state.settlements[0].currency).toBe('USD');
    expect(result.current.state.settlements[1].currency).toBe('EUR');
  });
});