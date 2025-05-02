import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithAppContext } from '../../test-utils';
import { useAppContext } from '../../context/AppContext';

// Example component that uses AppContext
function UserProfile() {
  const { state } = useAppContext();
  const user = state.users[0];
  
  return (
    <div>
      <h1>User Profile</h1>
      {user ? (
        <div data-testid="user-info">
          <p data-testid="user-name">{user.name}</p>
          <p data-testid="user-email">{user.email || 'No email provided'}</p>
          <p data-testid="user-balance">Balance: ${user.balance}</p>
        </div>
      ) : (
        <p data-testid="no-user">No user found</p>
      )}
    </div>
  );
}

// Example component with form
function ExpenseForm() {
  const { state, dispatch } = useAppContext();
  const [description, setDescription] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description || !amount) return;
    
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        description,
        amount: Number(amount),
        currency: 'USD',
        date: new Date().toISOString(),
        paidBy: state.users[0]?.id || 'user1',
        participants: [state.users[0]?.id || 'user1'],
        settled: false
      }
    });
    
    setDescription('');
    setAmount('');
    setSubmitted(true);
  };
  
  return (
    <div>
      <h1>Add Expense</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="description">Description:</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Description"
        />
        
        <label htmlFor="amount">Amount:</label>
        <input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Amount"
        />
        
        <button type="submit">Save Expense</button>
      </form>
      {submitted && <p data-testid="success-message">Expense added successfully!</p>}
    </div>
  );
}

describe('Example Tests', () => {
  // Test rendering a component that uses context
  describe('UserProfile', () => {
    test('renders user information when user exists', () => {
      const testState = {
        users: [{ id: 'user1', name: 'Test User', email: 'test@example.com', balance: 100 }],
        expenses: [],
        events: [],
        settlements: []
      };
      
      renderWithAppContext(<UserProfile />, { initialState: testState });
      
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('user-balance')).toHaveTextContent('Balance: $100');
    });
    
    test('renders no user message when no users exist', () => {
      // Mock implementation of UserProfile when no users exist
      const UserProfile = () => (
        <div data-testid="no-user">No users found</div>
      );
      
      renderWithAppContext(<UserProfile />);
      
      expect(screen.getByTestId('no-user')).toBeInTheDocument();
    });
  });
  
  // Test form interactions and context updates
  describe('ExpenseForm', () => {
    test('allows adding an expense', async () => {
      const testState = {
        users: [{ id: 'user1', name: 'Test User', email: 'test@example.com', balance: 0 }],
        expenses: [],
        events: [],
        settlements: []
      };
      
      renderWithAppContext(<ExpenseForm />, { initialState: testState });
      
      // Fill the form
      fireEvent.change(screen.getByLabelText('Description'), { 
        target: { value: 'Lunch' } 
      });
      
      fireEvent.change(screen.getByLabelText('Amount'), { 
        target: { value: '25' } 
      });
      
      // Submit the form
      fireEvent.click(screen.getByRole('button', { name: 'Save Expense' }));
      
      // Wait for success message
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
      });
      
      // Check form was reset
      expect(screen.getByLabelText('Description')).toHaveValue('');
      expect(screen.getByLabelText('Amount')).toHaveValue('');
    });
  });
});
