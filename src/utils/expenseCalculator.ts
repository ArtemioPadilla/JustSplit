import { User, Expense } from '../context/AppContext';
import { convertCurrency } from './currencyExchange';

interface DebtMap {
  [userId: string]: {
    [creditorId: string]: number;
  };
}

// Enhanced settlement interface with conversion details
interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
  expenseIds: string[];
  eventId?: string;
  conversionDetails?: {
    originalCurrency: string;
    originalAmount: number;
    targetCurrency: string;
    exchangeRate: number;
    date: string;
  }[];
}

// Calculate settlements between users
export const calculateSettlements = (
  expenses: Expense[], 
  users: User[], 
  eventId?: string
): Settlement[] => {
  // Filter expenses by event if eventId is provided
  const filteredExpenses = eventId 
    ? expenses.filter(exp => exp.eventId === eventId && !exp.settled)
    : expenses.filter(exp => !exp.settled);
  
  // Create a map of debts between users
  const debts: DebtMap = {};
  const expenseIdsByDebtors: Record<string, Record<string, string[]>> = {};
  
  // Initialize debts map
  users.forEach(user => {
    debts[user.id] = {};
    users.forEach(otherUser => {
      if (user.id !== otherUser.id) {
        debts[user.id][otherUser.id] = 0;
      }
    });
  });
  
  // Initialize expense ids tracking
  users.forEach(user => {
    expenseIdsByDebtors[user.id] = {};
    users.forEach(otherUser => {
      if (user.id !== otherUser.id) {
        expenseIdsByDebtors[user.id][otherUser.id] = [];
      }
    });
  });
  
  // Calculate net amounts for each expense
  filteredExpenses.forEach(expense => {
    // Skip settled expenses
    if (expense.settled) return;
    
    const payerId = expense.paidBy;
    const participantCount = expense.participants.length;
    
    if (participantCount === 0) return;
    
    const amountPerPerson = expense.amount / participantCount;
    
    expense.participants.forEach(participantId => {
      if (participantId === payerId) return; // Payer doesn't owe themselves
      
      // Participant owes payer
      debts[participantId][payerId] += amountPerPerson;
      
      // Track which expenses contribute to this debt
      if (!expenseIdsByDebtors[participantId][payerId]) {
        expenseIdsByDebtors[participantId][payerId] = [];
      }
      expenseIdsByDebtors[participantId][payerId].push(expense.id);
    });
  });
  
  // Simplify debts (cancel out mutual debts)
  users.forEach(user1 => {
    users.forEach(user2 => {
      if (user1.id === user2.id) return;
      
      // If both users owe each other, cancel out the smaller amount
      const user1OwesUser2 = debts[user1.id][user2.id];
      const user2OwesUser1 = debts[user2.id][user1.id];
      
      if (user1OwesUser2 > 0 && user2OwesUser1 > 0) {
        if (user1OwesUser2 >= user2OwesUser1) {
          debts[user1.id][user2.id] -= user2OwesUser1;
          debts[user2.id][user1.id] = 0;
        } else {
          debts[user2.id][user1.id] -= user1OwesUser2;
          debts[user1.id][user2.id] = 0;
        }
      }
    });
  });
  
  // Convert to settlements array
  const settlements: Settlement[] = [];
  
  users.forEach(debtor => {
    users.forEach(creditor => {
      if (debtor.id === creditor.id) return;
      
      const amount = debts[debtor.id][creditor.id];
      if (amount > 0) {
        settlements.push({
          fromUser: debtor.id,
          toUser: creditor.id,
          amount,
          expenseIds: expenseIdsByDebtors[debtor.id][creditor.id],
          eventId
        });
      }
    });
  });
  
  return settlements;
};

// Helper function to convert all expenses to a single currency for accurate settlement calculation
export const calculateSettlementsWithConversion = async (
  expenses: Expense[],
  users: User[],
  targetCurrency: string = 'USD',
  eventId?: string
): Promise<Settlement[]> => {
  // Create a copy of expenses to avoid modifying the original
  const convertedExpenses = await Promise.all(
    expenses.map(async (expense) => {
      if (expense.currency === targetCurrency) {
        return { ...expense };
      }
      
      // Convert amount to target currency
      const convertedAmount = await convertCurrency(
        expense.amount,
        expense.currency,
        targetCurrency
      );
      
      return {
        ...expense,
        amount: convertedAmount,
        originalAmount: expense.amount,
        originalCurrency: expense.currency,
        currency: targetCurrency
      };
    })
  );
  
  // Use the regular settlement calculation with converted expenses
  const settlements = calculateSettlements(convertedExpenses, users, eventId);
  
  // Now enrich the settlements with conversion details
  return settlements.map(settlement => {
    // Find the expenses for this settlement that had currency conversions
    const conversionDetails = settlement.expenseIds
      .map(expId => {
        const originalExpense = expenses.find(e => e.id === expId);
        const convertedExpense = convertedExpenses.find(e => e.id === expId);
        
        if (originalExpense && convertedExpense && originalExpense.currency !== targetCurrency) {
          return {
            originalCurrency: originalExpense.currency,
            originalAmount: originalExpense.amount,
            targetCurrency,
            exchangeRate: convertedExpense.amount / originalExpense.amount,
            date: new Date().toISOString() // Use current date as the conversion date
          };
        }
        return null;
      })
      .filter(Boolean);
    
    if (conversionDetails.length > 0) {
      return {
        ...settlement,
        conversionDetails
      };
    }
    
    return settlement;
  });
};
