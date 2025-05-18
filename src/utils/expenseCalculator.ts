import { Expense, User } from '../context/AppContext';
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
  // Filter expenses that aren't settled
  const unsettledExpenses = expenses.filter(e => !e.settled);
  
  // If filtering by event ID, apply the filter
  const filteredExpenses = filterEventId
    ? unsettledExpenses.filter(exp => exp.eventId === filterEventId)
    : unsettledExpenses;

  // Create a map for expenses between users
  const expenseMap: Record<string, Record<string, { ids: string[], eventIds: Set<string> }>> = {};
  
  // Initialize the expense map for all users
  users.forEach(user => {
    expenseMap[user.id] = {};
    // We won't pre-initialize all user relationships to avoid unnecessary memory usage
  });
  
  // Process each expense
  for (const expense of filteredExpenses) {
    const { id, paidBy, participants = [], amount, currency, eventId } = expense;
    
    // Ensure paidBy user exists in the map
    if (!expenseMap[paidBy]) {
      expenseMap[paidBy] = {};
    }
    
    // Convert amount if needed
    let convertedAmount = amount;
    if (currency !== targetCurrency) {
      try {
        const rateData = await convertCurrency(amount, currency, targetCurrency);
        const rate = typeof rateData === 'object' && rateData !== null ? rateData.rate : 1;
        convertedAmount = amount * rate;
      } catch (error) {
        console.error(`Error converting currency from ${currency} to ${targetCurrency}:`, error);
      }
    }
    
    const amountPerPerson = participants.length > 0 ? convertedAmount / participants.length : 0;
    
    // Process each participant
    participants.forEach(participantId => {
      // Skip if participant is the same as who paid
      if (participantId === paidBy) return;
      
      // Ensure participant exists in the expense map
      if (!expenseMap[participantId]) {
        expenseMap[participantId] = {};
      }
      
      // Ensure the relationships between users exist in the map
      if (!expenseMap[participantId][paidBy]) {
        expenseMap[participantId][paidBy] = { ids: [], eventIds: new Set() };
      }
      if (!expenseMap[paidBy][participantId]) {
        expenseMap[paidBy][participantId] = { ids: [], eventIds: new Set() };
      }
      
      // Track this expense for this user relationship in both directions
      expenseMap[participantId][paidBy].ids.push(id);
      expenseMap[paidBy][participantId].ids.push(id);
      
      // If the expense is part of an event, track that too
      if (eventId) {
        expenseMap[participantId][paidBy].eventIds.add(eventId);
        expenseMap[paidBy][participantId].eventIds.add(eventId);
      }
    });
  }
  
  // Calculate settlements based on the expense map
  const settlements: Settlement[] = [];

  // Identify debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];
  
  Object.entries(expenseMap).forEach(([userId, userExpenses]) => {
    // Only consider users with actual expenses recorded
    if (Object.keys(userExpenses).length === 0) return;
    
    // Calculate net balance for this user
    const totalOwed = Object.values(userExpenses).reduce((sum, exp) => sum + exp.ids.length, 0);
    const totalOwing = Object.values(expenseMap).reduce((sum, otherUserExpenses) => {
      const otherUserId = otherUserExpenses[Object.keys(otherUserExpenses)[0]];
      return sum + (otherUserId?.ids.includes(userId) ? otherUserId.ids.length : 0);
    }, 0);
    
    const balance = totalOwed - totalOwing;
    
    if (balance < 0) {
      debtors.push({ id: userId, amount: -balance });
    } else if (balance > 0) {
      creditors.push({ id: userId, amount: balance });
    }
  });
  
  // Sort debtors and creditors by amount (desc)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);
  
  // Generate settlements
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];
    
    // Calculate settlement amount (minimum of what is owed and what is to be received)
    const settlementAmount = Math.min(debtor.amount, creditor.amount);
    
    if (settlementAmount > 0.01) { // Only create settlement if amount is significant
      // Get all expenses involving these two users
      const relatedExpenseIds = expenseMap[debtor.id][creditor.id]?.ids || [];
      
      // Determine the eventId for the settlement (use the most common eventId if multiple)
      let settlementEventId: string | undefined = undefined;
      const eventIds = expenseMap[debtor.id][creditor.id]?.eventIds;
      
      if (eventIds && eventIds.size > 0) {
        if (eventIds.size === 1) {
          // If there's only one event ID, use it
          settlementEventId = Array.from(eventIds)[0];
        } else if (!filterEventId) {
          // For global settlements with multiple event IDs, leave it undefined
          // The calling code will filter by eventId if needed
        }
      }
      
      // Create settlement
      settlements.push({
        fromUser: debtor.id,
        toUser: creditor.id,
        amount: settlementAmount,
        expenseIds: relatedExpenseIds,
        eventId: settlementEventId || filterEventId
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
