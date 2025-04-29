import { Expense, User, Event } from '../context/AppContext';

/**
 * Convert expenses data to CSV format
 */
export const expensesToCSV = (
  expenses: Expense[],
  users: User[],
  events: Event[]
): string => {
  // Define CSV headers
  const headers = [
    'Date',
    'Description',
    'Amount',
    'Currency',
    'Paid By',
    'Participants',
    'Event',
    'Status',
    'Notes',
  ];

  // Get user name by ID
  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Get event name by ID
  const getEventName = (eventId?: string): string => {
    if (!eventId) return 'No Event';
    const event = events.find((e) => e.id === eventId);
    return event ? event.name : 'Unknown Event';
  };

  // Convert each expense to a CSV row
  const rows = expenses.map((expense) => {
    const paidByName = getUserName(expense.paidBy);
    const participantNames = expense.participants
      .map(getUserName)
      .join(', ');
    const eventName = getEventName(expense.eventId);
    const status = expense.settled ? 'Settled' : 'Unsettled';
    
    return [
      new Date(expense.date).toLocaleDateString(),
      expense.description,
      expense.amount.toFixed(2),
      expense.currency,
      paidByName,
      participantNames,
      eventName,
      status,
      expense.notes || ''
    ].map(value => `"${value.toString().replace(/"/g, '""')}"`).join(',');
  });

  // Combine headers and rows
  return [headers.join(','), ...rows].join('\n');
};

/**
 * Download data as a CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export expenses to a CSV file and trigger download
 */
export const exportExpensesToCSV = (
  expenses: Expense[],
  users: User[],
  events: Event[],
  filename: string = 'expenses.csv'
): void => {
  const csvContent = expensesToCSV(expenses, users, events);
  downloadCSV(csvContent, filename);
};
