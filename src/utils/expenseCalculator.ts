import { Expense, User } from '../types';
import { convertCurrency } from './currencyExchange';

interface Settlement {
  fromUser: string;
  toUser: string;
  amount: number;
  expenseIds: string[];
  eventId?: string;
}

// Calculate optimal settlements between users
export function calculateSettlements(
  expenses: Expense[], 
  users: User[],
  eventId?: string
): Settlement[] {
  // Filter expenses by event if eventId is provided
  const filteredExpenses = eventId 
    ? expenses.filter(e => e.eventId === eventId && !e.settled)
    : expenses.filter(e => !e.settled);
  
  if (filteredExpenses.length === 0) return [];
  
  // Calculate net balance for each user
  const balances: Record<string, number> = {};
  
  // Initialize balances
  users.forEach(user => {
    balances[user.id] = 0;
  });
  
  // Calculate balances from expenses
  filteredExpenses.forEach(expense => {
    const { paidBy, participants, amount } = expense;
    const amountPerPerson = amount / participants.length;
    
    participants.forEach(participantId => {
      // Skip the person who paid
      if (participantId === paidBy) return;
      
      // Decrease participant balance (they owe money)
      balances[participantId] = (balances[participantId] || 0) - amountPerPerson;
      
      // Increase payer balance (they are owed money)
      balances[paidBy] = (balances[paidBy] || 0) + amountPerPerson;
    });
  });
  
  // Identify debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];
  
  Object.entries(balances).forEach(([userId, balance]) => {
    // Skip users with zero balance
    if (Math.abs(balance) < 0.01) return;
    
    if (balance < 0) {
      debtors.push({ id: userId, amount: -balance }); // Convert to positive amount
    } else {
      creditors.push({ id: userId, amount: balance });
    }
  });
  
  // Sort debtors and creditors by amount (desc)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  // Generate settlements
  const settlements: Settlement[] = [];
  
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    // Calculate settlement amount (minimum of what is owed and what is to be received)
    const settlementAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settlementAmount > 0) {
      // Find related expenses for this settlement
      const relatedExpenseIds = filteredExpenses
        .filter(expense => 
          expense.paidBy === creditor.id && 
          expense.participants.includes(debtor.id)
        )
        .map(expense => expense.id);
      
      // Create settlement
      settlements.push({
        fromUser: debtor.id,
        toUser: creditor.id,
        amount: settlementAmount,
        expenseIds: relatedExpenseIds,
        eventId
      });
      
      // Update balances
      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;
    }
    
    // Remove users with zero balance
    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }
  
  return settlements;
}

// Calculate settlements with currency conversion
export const calculateSettlementsWithConversion = async (
  expenses: Expense[],
  users: User[],
  targetCurrency: string = 'USD',
  filterEventId?: string
): Promise<Settlement[]> => {
  const unsettledExpenses = expenses.filter(e => !e.settled);
  
  const filteredExpenses = filterEventId
    ? unsettledExpenses.filter(exp => exp.eventId === filterEventId)
    : unsettledExpenses;

  if (filteredExpenses.length === 0) {
    return [];
  }

  const balances: Record<string, number> = {};
  users.forEach(user => {
    balances[user.id] = 0;
  });

  const contributingExpenseIds = new Set<string>();

  for (const expense of filteredExpenses) {
    contributingExpenseIds.add(expense.id);
    const numParticipants = expense.participants.length;
    if (numParticipants === 0) continue;

    let amountInTargetCurrency = expense.amount;
    if (expense.currency.toUpperCase() !== targetCurrency.toUpperCase()) {
      const conversionResult = await convertCurrency(expense.amount, expense.currency, targetCurrency);
      amountInTargetCurrency = conversionResult.convertedAmount;
    }

    const share = amountInTargetCurrency / numParticipants;

    // Initialize balance if user is not in the initial users list but is a payer/participant
    if (balances[expense.paidBy] === undefined) {
      balances[expense.paidBy] = 0;
    }
    balances[expense.paidBy] += amountInTargetCurrency;

    expense.participants.forEach(participantId => {
      if (balances[participantId] === undefined) {
        balances[participantId] = 0;
      }
      balances[participantId] -= share;
    });
  }
  
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];
  
  Object.entries(balances).forEach(([userId, balance]) => {
    if (balance > 0.01) { // User is owed money (creditor)
      creditors.push({ id: userId, amount: balance });
    } else if (balance < -0.01) { // User owes money (debtor)
      debtors.push({ id: userId, amount: -balance }); // Store amount as positive
    }
  });
  
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  const settlements: Settlement[] = [];
  
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    let settlementAmount = Math.min(debtor.amount, creditor.amount);
    settlementAmount = parseFloat(settlementAmount.toFixed(2)); // Round to 2 decimal places for currency

    if (settlementAmount > 0.01) { 
      settlements.push({
        fromUser: debtor.id,
        toUser: creditor.id,
        amount: settlementAmount,
        expenseIds: Array.from(contributingExpenseIds),
        eventId: filterEventId,
      });
    }
    
    debtor.amount -= settlementAmount;
    creditor.amount -= settlementAmount;
    
    // Round amounts to avoid floating point issues
    debtor.amount = parseFloat(debtor.amount.toFixed(5));
    creditor.amount = parseFloat(creditor.amount.toFixed(5));

    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }
  
  return settlements;
};
