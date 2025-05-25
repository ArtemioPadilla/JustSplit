// Debug script to test the reducer logic in isolation
const { v4: uuidv4 } = require('uuid');

// Copy the reducer logic
const reducer = (state, action) => {
  console.log('Reducer called with action:', action.type);
  console.log('Current state users length:', state.users.length);
  
  switch (action.type) {
    case 'ADD_USER':
      const newUser = {
        id: uuidv4(),
        name: action.payload.name,
        email: action.payload.email,
        balance: 0,
      };
      console.log('Creating new user:', newUser);
      const newState = { ...state, users: [...state.users, newUser] };
      console.log('New state users length:', newState.users.length);
      return newState;
      
    default:
      console.log('Unknown action type, returning current state');
      return state;
  }
};

// Test the reducer
const initialState = {
  users: [],
  expenses: [],
  events: [],
  settlements: [],
  groups: [],
  isDataLoaded: false,
  currentUser: null
};

console.log('Initial state:', initialState);

const action = {
  type: 'ADD_USER',
  payload: { name: 'New User', email: 'new@example.com' }
};

const result = reducer(initialState, action);
console.log('Result:', result);
console.log('Users in result:', result.users);
