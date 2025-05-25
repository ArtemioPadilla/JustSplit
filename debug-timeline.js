// Debug script to test position calculations
const mockExpenses = [
  {
    id: 'exp1',
    eventId: 'event1',
    amount: 100,
    currency: 'USD',
    settled: true,
    date: '2023-05-20', // Pre-event
    description: 'Pre-event expense'
  },
  {
    id: 'exp2',
    eventId: 'event1',
    amount: 50,
    currency: 'USD',
    settled: false,
    date: '2023-06-01', // Start date
    description: 'Start date expense'
  },
  {
    id: 'exp3',
    eventId: 'event1',
    amount: 200,
    currency: 'USD',
    settled: true,
    date: '2023-06-05', // Mid-event
    description: 'Mid-event expense'
  },
  {
    id: 'exp4',
    eventId: 'event1',
    amount: 75,
    currency: 'EUR',
    settled: false,
    date: '2023-06-05T12:00:00', // Same day as exp3
    description: 'Same day expense'
  },
  {
    id: 'exp5',
    eventId: 'event1',
    amount: 25,
    currency: 'USD',
    settled: false,
    date: '2023-06-10', // End date
    description: 'End date expense'
  }
];

const mockEvent = {
  id: 'event1',
  name: 'Test Event',
  startDate: '2023-06-01',
  endDate: '2023-06-10',
  participants: ['user1', 'user2']
};

// Copy of the calculatePositionPercentage function
const calculatePositionPercentage = (date, startDate, endDate) => {
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

// Calculate positions for all expenses
console.log('Calculating positions for expenses:');
mockExpenses.forEach(expense => {
  const position = calculatePositionPercentage(expense.date, mockEvent.startDate, mockEvent.endDate);
  console.log(`${expense.id} (${expense.date}): ${position}%`);
});

// Test grouping with 1% threshold
console.log('\nGrouping with 1% threshold:');
const proximityThreshold = 1;
const groupedExpenses = [];

const expensesWithPositions = mockExpenses.map(expense => ({
  expense,
  position: calculatePositionPercentage(expense.date, mockEvent.startDate, mockEvent.endDate)
}));

for (const { expense, position } of expensesWithPositions) {
  const existingGroup = groupedExpenses.find(
    group => Math.abs(group.position - position) < proximityThreshold
  );
  
  if (existingGroup) {
    console.log(`  Adding ${expense.id} to existing group at ${existingGroup.position}% (diff: ${Math.abs(existingGroup.position - position)}%)`);
    existingGroup.expenses.push(expense);
    existingGroup.position = existingGroup.expenses.reduce(
      (sum, exp) => sum + calculatePositionPercentage(exp.date, mockEvent.startDate, mockEvent.endDate),
      0
    ) / existingGroup.expenses.length;
  } else {
    console.log(`  Creating new group for ${expense.id} at ${position}%`);
    groupedExpenses.push({ position, expenses: [expense] });
  }
}

console.log(`\nFinal groups: ${groupedExpenses.length}`);
groupedExpenses.forEach((group, index) => {
  console.log(`Group ${index + 1}: ${group.expenses.map(e => e.id).join(', ')} at ${group.position}%`);
});
