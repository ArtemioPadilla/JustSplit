import { Expense, User, Settlement } from '../context/AppContext';

interface Balance {
  userId: string;
  amount: number;
}

interface SettlementCalculation {
  fromUser: string;
  toUser: string;
  amount: number;
  expenseIds: string[];
}

// Calculate individual shares from an expense
export const calculateExpenseShares = (expense: Expense): Record<string, number> => {
  const perPersonAmount = expense.amount / expense.participants.length;
  
  const shares: Record<string, number> = {};
  
  // Initialize all participants with their share
  expense.participants.forEach(userId => {
    shares[userId] = -perPersonAmount; // Negative means they owe money
  });
  
  // The person who paid gets credited
  if (shares[expense.paidBy]) {
    shares[expense.paidBy] += expense.amount;
  } else {
    shares[expense.paidBy] = expense.amount;
  }
  
  return shares;
};

// Calculate overall balances for all users
export const calculateBalances = (expenses: Expense[], users: User[]): Balance[] => {
  const balances: Record<string, number> = {};
  
  // Initialize balances for all users
  users.forEach(user => {
    balances[user.id] = 0;
  });
  
  // Calculate each expense's contribution to the balance
  expenses.filter(expense => !expense.settled).forEach(expense => {
    const shares = calculateExpenseShares(expense);
    
    Object.entries(shares).forEach(([userId, amount]) => {
      if (balances[userId] !== undefined) {
        balances[userId] += amount;
      } else {
        balances[userId] = amount;
      }
    });
  });
  
  return Object.entries(balances).map(([userId, amount]) => ({
    userId,
    amount,
  }));
};

// Calculate optimal settlements to minimize transactions
export const calculateSettlements = (
  expenses: Expense[],
  users: User[]
): SettlementCalculation[] => {
  const balances = calculateBalances(expenses, users);
  const unsettledExpenses = expenses.filter(expense => !expense.settled);
  
  // Separate debtors and creditors
  const debtors = balances.filter(balance => balance.amount < 0)
    .sort((a, b) => a.amount - b.amount); // Sort ascending (most negative first)
  
  const creditors = balances.filter(balance => balance.amount > 0)
    .sort((a, b) => b.amount - a.amount); // Sort descending (most positive first)
  
  const settlements: SettlementCalculation[] = [];
  
  // Create a map of expense IDs by user (who paid)
  const expensesByPayer: Record<string, string[]> = {};
  unsettledExpenses.forEach(expense => {
    if (!expensesByPayer[expense.paidBy]) {
      expensesByPayer[expense.paidBy] = [];
    }
    expensesByPayer[expense.paidBy].push(expense.id);
  });
  
  // Match debtors with creditors to minimize transactions
  let debtorIndex = 0;
  let creditorIndex = 0;
  
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    
    const debtAmount = Math.abs(debtor.amount);
    const creditAmount = creditor.amount;
    
    // Calculate the amount that can be settled
    const settlementAmount = Math.min(debtAmount, creditAmount);
    
    if (settlementAmount > 0) {
      settlements.push({
        fromUser: debtor.userId,
        toUser: creditor.userId,
        amount: Number(settlementAmount.toFixed(2)), // Round to 2 decimal places
        expenseIds: expensesByPayer[creditor.userId] || [],
      });
      
      // Update balances
      debtor.amount += settlementAmount;
      creditor.amount -= settlementAmount;
    }
    
    // Move to next user if balance is (nearly) zero
    if (Math.abs(debtor.amount) < 0.01) {
      debtorIndex++;
    }
    
    if (Math.abs(creditor.amount) < 0.01) {
      creditorIndex++;
    }
  }
  
  return settlements;
};

// Helper function to get username by ID
export const getUserName = (userId: string, users: User[]): string => {
  const user = users.find(u => u.id === userId);
  return user ? user.name : 'Unknown User';
};
