import { format } from 'date-fns';
// Import main types. Note: TimelineExpense from src/types has date: Date.
// The functions here often work with string dates from the base Expense type.
// We'll use Expense and Event from '../../types' where appropriate
import { Expense, Event as MainEvent } from '../../types'; // Renamed Event to MainEvent to avoid conflict if 'Event' is a global type

/**
 * Calculate timeline progress (percentage of time elapsed in event)
 */
export const calculateTimelineProgress = (startDate: string, endDate?: string): number => {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const now = Date.now();
  
  // If event has ended
  if (now > end) return 100;
  
  // If event hasn't started
  if (now < start) return 0;
  
  // Event is ongoing
  const totalDuration = end - start;
  const elapsed = now - start;
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
};

/**
 * Enhanced position calculation to handle pre-event and post-event expenses
 */
export const calculatePositionPercentage = (date: string, startDate: string, endDate?: string): number => {
  const targetDate = new Date(date).getTime();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : new Date().getTime();
  
  // Calculate the total event duration
  const totalDuration = end - start;
  
  // For pre-event expenses (before start date)
  if (targetDate < start) {
    // Allocate 20% of the timeline for pre-event expenses
    // Find how far back this expense is - up to 30 days before
    const daysBeforeEvent = (start - targetDate) / (1000 * 60 * 60 * 24);
    const maxDaysToShow = 30; // Show up to 30 days before
    const preEventPosition = 20 * Math.min(daysBeforeEvent, maxDaysToShow) / maxDaysToShow;
    return -Math.min(20, preEventPosition); // Cap at -20%
  }
  
  // For post-event expenses (after end date)
  if (endDate && targetDate > end) {
    // Allocate 20% of the timeline for post-event expenses
    // Find how far after this expense is - up to 30 days after
    const daysAfterEvent = (targetDate - end) / (1000 * 60 * 60 * 24);
    const maxDaysToShow = 30; // Show up to 30 days after
    const postEventPosition = 20 * Math.min(daysAfterEvent, maxDaysToShow) / maxDaysToShow;
    return 100 + Math.min(20, postEventPosition); // Start at 100% and go up to 120%
  }
  
  // For expenses exactly on the start date - shift slightly to avoid dot overlap
  if (Math.abs(targetDate - start) < 1000 * 60 * 60) { // Within an hour of start
    return 1; // Position at 1% to avoid overlapping the start dot but still be visible
  }
  
  // For expenses exactly on the end date - shift slightly to avoid dot overlap
  if (endDate && Math.abs(targetDate - end) < 1000 * 60 * 60) { // Within an hour of end
    return 99; // Position at 99% to avoid overlapping the end dot but still be visible
  }
  
  // For expenses within the event period
  if (targetDate >= start && (!endDate || targetDate <= end)) {
    return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
  }
  
  // Fallback (should not reach here)
  return 100;
};

/**
 * Group nearby expenses for hover display
 * This function was using the local TimelineExpense and TimelineEvent.
 * It should now use the main Expense and MainEvent types, or a specific subset if needed.
 * For now, let's assume it operates on the base Expense type and MainEvent.
 * The `date` property in `Expense` is a string, which calculatePositionPercentage expects.
 */
export const groupNearbyExpenses = (expenses: Expense[], event: MainEvent): { position: number, expenses: Expense[] }[] => {
  // Calculate positions for all expenses
  const expensesWithPositions = expenses.map(expense => ({
    expense,
    position: calculatePositionPercentage(expense.date, event.startDate || event.date, event.endDate) // Use event.date as fallback for startDate
  }));

  // Sort expenses by position to ensure consistent grouping
  expensesWithPositions.sort((a, b) => a.position - b.position);

  // Group expenses that are within a very small threshold of each other
  // Use a tighter threshold to prevent over-grouping
  const proximityThreshold = 5; // 5% threshold for grouping nearby expenses
  const groupedExpenses: { position: number, expenses: Expense[] }[] = [];
   for (const { expense, position } of expensesWithPositions) {
    // Find an existing group where this expense is within threshold of the FIRST expense in that group
    // This prevents issues with expanding group ranges through averaging
    let foundGroup = false;
    
    for (let i = 0; i < groupedExpenses.length; i++) {
      const group = groupedExpenses[i];
      // Check proximity against the original position of the first expense in the group
      const firstExpensePosition = calculatePositionPercentage(
        group.expenses[0].date, 
        event.startDate || event.date, 
        event.endDate
      );
      
      const distance = Math.abs(firstExpensePosition - position);
      
      if (distance < proximityThreshold) {
        group.expenses.push(expense);
        // Recalculate average position for the group
        group.position = group.expenses.reduce(
          (sum, exp) => sum + calculatePositionPercentage(exp.date, event.startDate || event.date, event.endDate),
          0
        ) / group.expenses.length;
        foundGroup = true;
        break;
      }
    }
    
    // If no suitable group found, create a new one
    if (!foundGroup) {
      groupedExpenses.push({ position, expenses: [expense] });
    }
  }
  
  return groupedExpenses;
};

/**
 * Format date for display
 */
export const formatTimelineDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Add one day to fix the date offset issue
  date.setDate(date.getDate() + 1);
  return format(date, 'MMM d, yyyy');
};

/**
 * Helper function to calculate the percentage of expenses settled
 * This function should operate on the base Expense type.
 */
export const calculateSettledPercentage = (expenses: Expense[]): number => {
  if (expenses.length === 0) return 0;
  
  const settledExpenses = expenses.filter(expense => expense.settled === true);
  return (settledExpenses.length / expenses.length) * 100;
};

/**
 * Calculate total by currency
 * This function should operate on the base Expense type.
 */
export const calculateTotalByCurrency = (expenses: Expense[]): Record<string, number> => {
  const totals: Record<string, number> = {};
  expenses.forEach((expense: Expense) => {
    if (!totals[expense.currency]) {
      totals[expense.currency] = 0;
    }
    totals[expense.currency] += expense.amount;
  });
  return totals;
};

/**
 * Helper function to calculate unsettled amount
 * This function should operate on the base Expense type.
 */
export const calculateUnsettledAmount = (expenses: Expense[]): Record<string, number> => {
  const unsettled: Record<string, number> = {};
  expenses.forEach((expense: Expense) => {
    if (expense.settled !== true) {
      if (!unsettled[expense.currency]) {
        unsettled[expense.currency] = 0;
      }
      unsettled[expense.currency] += expense.amount;
    }
  });
  return unsettled;
};

/**
 * Calculates the timeline position for an expense based on event start and end dates
 * @param expense The expense to calculate position for (using main Expense type)
 * @param event The associated event (using main Event type)
 * @returns A number between 0 and 100 representing the relative position on the timeline
 */
export const calculateExpensePosition = (expense: Expense, event: MainEvent): number => {
  const expenseDate = new Date(expense.date).getTime();
  // Use event.date as a fallback if event.startDate is not present
  const eventStartDateString = event.startDate || event.date;
  const startDate = new Date(eventStartDateString).getTime();
  const endDate = event.endDate ? new Date(event.endDate).getTime() : startDate;
  
  // If event has no duration (start date equals end date), position expenses relatively to each other
  if (startDate === endDate) {
    return 50; // Center position
  }
  
  // Calculate percentage position
  let position = ((expenseDate - startDate) / (endDate - startDate)) * 100;
  
  // Ensure position is within bounds
  position = Math.min(Math.max(0, position), 100);
  
  return position;
};

/**
 * Groups expenses by their date
 * @param expenses Array of expenses to group (using main Expense type)
 * @returns An object with dates as keys and arrays of expenses as values
 */
export const groupExpensesByDate = (expenses: Expense[]): Record<string, Expense[]> => {
  return expenses.reduce((groups, expense) => {
    // Format date as YYYY-MM-DD for grouping
    const dateKey = new Date(expense.date).toISOString().split('T')[0];
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(expense);
    return groups;
  }, {} as Record<string, Expense[]>);
};

/**
 * Formats a date range for display, handling various cases
 * @param startDate Start date of the range
 * @param endDate Optional end date of the range
 * @returns Formatted date range string
 */
export const formatDateRange = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  // Add one day to fix the date offset issue
  start.setDate(start.getDate() + 1);
  
  if (!endDate) {
    return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  }
  
  const end = new Date(endDate);
  // Add one day to fix the date offset issue
  end.setDate(end.getDate() + 1);
  
  // If same day, return just one date
  if (start.toDateString() === end.toDateString()) {
    return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
  }
  
  // If same month and year, show format like "Jun 1-15, 2023"
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM')} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
  }
  
  // If same year, show format like "Jan 1 - Feb 15, 2023"
  if (start.getFullYear() === end.getFullYear()) {
    return `${format(start, 'MMM')} ${start.getDate()} - ${format(end, 'MMM')} ${end.getDate()}, ${start.getFullYear()}`;
  }
  
  // Different years, show format like "12/1/2022 - 1/15/2023"
  return `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()} - ${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`;
}