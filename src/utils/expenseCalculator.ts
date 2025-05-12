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
export async function calculateSettlementsWithConversion(
  expenses: Expense[], 
  users: User[],
  targetCurrency: string,
  isConvertingCurrencies: boolean = true,
  eventId?: string
): Promise<Settlement[]> {
  // If not converting currencies, fall back to standard calculations with original currency
  if (!isConvertingCurrencies) {
    // Just calculate settlements in original currencies (matching logic below but without conversions)
    const settlements = calculateSettlements(expenses, users, eventId);
    return settlements;
  }

  // Filter expenses by event if eventId is provided
  const filteredExpenses = eventId 
    ? expenses.filter(e => e.eventId === eventId && !e.settled)
    : expenses.filter(e => !e.settled);
  
  if (filteredExpenses.length === 0) return [];
  
  // Calculate net balance for each user, converting currencies as needed
  const balances: Record<string, number> = {};
  
  // Keep track of which expenses were involved in each user relationship and their event IDs
  const expenseMap: Record<string, Record<string, { ids: string[], eventIds: Set<string> }>> = {};
  
  // Track expense details for better debugging and settlement calculation
  const expenseDetails: Record<string, { originalAmount: number, currency: string, convertedAmount: number }> = {};
  
  // Initialize balances and expense maps
  users.forEach(user => {
    balances[user.id] = 0;
    expenseMap[user.id] = {};
    
    // Initialize maps for all user relationships
    users.forEach(otherUser => {
      if (user.id !== otherUser.id) {
        expenseMap[user.id][otherUser.id] = { ids: [], eventIds: new Set() };
      }
    });
  });

  // Cache exchange rates to avoid redundant API calls
  const exchangeRatesCache: Record<string, number> = {};

  try {
    console.log(`Starting settlement calculation with target currency: ${targetCurrency}`);
    console.log(`Total expenses to process: ${filteredExpenses.length}`);
    console.log(`Currency conversion is ${isConvertingCurrencies ? 'enabled' : 'disabled'}`);
    
    // Process each expense with currency conversion
    for (const expense of filteredExpenses) {
      const { paidBy, participants, amount, currency, id, eventId: expenseEventId } = expense;

      // Convert amount to target currency if currency conversion is enabled
      let convertedAmount = amount;
      
      // Only perform conversion if currencies differ and conversion is enabled
      if (currency !== targetCurrency && isConvertingCurrencies) {
        const conversionKey = `${currency}_${targetCurrency}`;
        
        try {
          // Use cached rate if available
          if (exchangeRatesCache[conversionKey]) {
            convertedAmount = amount * exchangeRatesCache[conversionKey];
          } else {
            // Fetch new rate
            const rateData = await convertCurrency(amount, currency, targetCurrency);
            // Store the conversion rate for future use
            const rate = rateData.convertedAmount / amount;
            exchangeRatesCache[conversionKey] = rate;
            convertedAmount = rateData.convertedAmount;
          }
          
          // Store expense details for debugging
          expenseDetails[id] = {
            originalAmount: amount,
            currency,
            convertedAmount
          };
          
          console.log(`Converted ${amount} ${currency} to ${convertedAmount.toFixed(2)} ${targetCurrency} for expense ${id}`);
        } catch (error) {
          console.error(`Currency conversion failed for expense ${id} (${amount} ${currency}):`, error);
          // Use an approximate conversion if API fails (fallback to avoid skipping expenses)
          // Using common conversion rates as fallback
          if (currency === 'MXN' && targetCurrency === 'USD') {
            convertedAmount = amount / 17.05; // Approximate MXN to USD rate
            console.log(`Using fallback conversion: ${amount} MXN ≈ ${convertedAmount.toFixed(2)} USD`);
          } else if (currency === 'USD' && targetCurrency === 'MXN') {
            convertedAmount = amount * 17.05; // Approximate USD to MXN rate
            console.log(`Using fallback conversion: ${amount} USD ≈ ${convertedAmount.toFixed(2)} MXN`);
          } else {
            // Assign a default fallback value to avoid undefined
            convertedAmount = amount; // Use the original amount as a fallback
            console.log(`Fallback to original amount: ${amount} ${currency}`);
          }
          
          // Store the fallback conversion
          expenseDetails[id] = {
            originalAmount: amount,
            currency,
            convertedAmount
          };
        }
      } else {
        // Log expenses that don't need conversion
        expenseDetails[id] = {
          originalAmount: amount,
          currency,
          convertedAmount
        };
      }
      
      const amountPerPerson = convertedAmount / participants.length;
      
      // Update balances for each participant
      participants.forEach(participantId => {
        // Skip the person who paid (they don't owe themselves)
        if (participantId === paidBy) return;

        // Decrease participant balance (they owe money)
        balances[participantId] = (balances[participantId] || 0) - amountPerPerson;

        // Increase payer balance (they are owed money)
        balances[paidBy] = (balances[paidBy] || 0) + amountPerPerson;

        // Track this expense for this user relationship in both directions
        if (!expenseMap[participantId][paidBy]) {
          expenseMap[participantId][paidBy] = { ids: [], eventIds: new Set() };
        }
        if (!expenseMap[paidBy][participantId]) {
          expenseMap[paidBy][participantId] = { ids: [], eventIds: new Set() };
        }

        // Add expense to both directions for tracking
        expenseMap[participantId][paidBy].ids.push(id);
        expenseMap[paidBy][participantId].ids.push(id);

        // Track event IDs for proper event attribution in settlements
        if (expenseEventId) {
          expenseMap[participantId][paidBy].eventIds.add(expenseEventId);
          expenseMap[paidBy][participantId].eventIds.add(expenseEventId);
        }
      });
    }
    
    // Log balance information for debugging
    console.log("User balances after expense processing:");
    Object.entries(balances).forEach(([userId, balance]) => {
      const userName = users.find(u => u.id === userId)?.name || userId;
      console.log(`${userName}: ${balance.toFixed(2)} ${targetCurrency}`);
    });
  } catch (error) {
    console.error('Error during settlement calculation:', error);
    return []; // Return empty settlements to prevent crashing
  }
  
  // Identify debtors and creditors
  const debtors: { id: string; amount: number }[] = [];
  const creditors: { id: string; amount: number }[] = [];
  
  Object.entries(balances).forEach(([userId, balance]) => {
    // Only consider significant balances (avoid floating-point rounding issues)
    if (Math.abs(balance) < 0.01) return;
    
    if (balance < 0) {
      debtors.push({ id: userId, amount: -balance }); // Convert to positive amount
    } else {
      creditors.push({ id: userId, amount: balance });
    }
  });
  
  // Log the identified debtors and creditors
  console.log(`Found ${debtors.length} debtors and ${creditors.length} creditors`);
  
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
        } else if (!eventId) {
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
        eventId: settlementEventId || eventId
      });
      
      console.log(`Created settlement: ${users.find(u => u.id === debtor.id)?.name || debtor.id} -> ${users.find(u => u.id === creditor.id)?.name || creditor.id}: ${settlementAmount.toFixed(2)} ${targetCurrency}`);
      
      // Update balances
      debtor.amount -= settlementAmount;
      creditor.amount -= settlementAmount;
    }
    
    // Remove users with zero balance
    if (debtor.amount < 0.01) debtors.shift();
    if (creditor.amount < 0.01) creditors.shift();
  }
  
  console.log(`Generated ${settlements.length} settlements in ${targetCurrency}`);
  return settlements;
}
