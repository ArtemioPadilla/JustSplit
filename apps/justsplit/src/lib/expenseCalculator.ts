import { Expense } from '../types';

export interface BasicParticipant {
  id: string;
  name: string;
}

// Renamed to avoid conflict with imported Expense
export interface LocalExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  paidBy: string; // Participant id
  participants: string[]; // Array of participant ids
  date: Date;
}

export interface Balance {
  from: string; // Participant id
  to: string; // Participant id
  amount: number;
}

/**
 * Calculates the equal split of an expense among participants
 */
export function calculateEqualSplit(expense: Expense): number {
  return expense.amount / expense.participants.length;
}

/**
 * Calculates the balances for a list of expenses
 */
export function calculateBalances(expenses: Expense[], participants: BasicParticipant[]): Balance[] {
  // Create a map to store each participant's balance
  const balanceMap = new Map<string, number>();
  
  // Initialize balances to zero
  participants.forEach(participant => {
    balanceMap.set(participant.id, 0);
  });
  
  // Calculate individual balances
  expenses.forEach(expense => {
    const paidBy = expense.paidBy;
    const splitAmount = calculateEqualSplit(expense);
    
    // Add the full amount to the payer's balance
    balanceMap.set(paidBy, (balanceMap.get(paidBy) || 0) + expense.amount);
    
    // Subtract the split amount from each participant's balance
    expense.participants.forEach(participantId => {
      balanceMap.set(participantId, (balanceMap.get(participantId) || 0) - splitAmount);
    });
  });
  
  // Convert the balance map to a list of transactions
  const balances: Balance[] = [];
  const participantsWithDebt = new Map<string, number>();
  const participantsWithCredit = new Map<string, number>();
  
  // Separate participants with debt and credit
  balanceMap.forEach((balance, participantId) => {
    if (balance < 0) {
      participantsWithDebt.set(participantId, Math.abs(balance));
    } else if (balance > 0) {
      participantsWithCredit.set(participantId, balance);
    }
  });
  
  // Create balance transactions
  participantsWithDebt.forEach((debtAmount, debtorId) => {
    let remainingDebt = debtAmount;
    
    participantsWithCredit.forEach((creditAmount, creditorId) => {
      if (remainingDebt > 0 && creditAmount > 0) {
        const transferAmount = Math.min(remainingDebt, creditAmount);
        
        balances.push({
          from: debtorId,
          to: creditorId,
          amount: transferAmount
        });
        
        // Update remaining amounts
        remainingDebt -= transferAmount;
        participantsWithCredit.set(creditorId, creditAmount - transferAmount);
      }
    });
  });
  
  return balances;
}
