// Simple Node.js script to debug the grouping function
const { groupNearbyExpenses, calculatePositionPercentage } = require('./src/utils/timelineUtils/index.ts');

// Mock data matching the test
const expenses = [
  { id: 'exp1', date: '2023-05-20', description: 'Pre-event expense' },
  { id: 'exp2', date: '2023-06-01', description: 'Start date expense' },
  { id: 'exp3', date: '2023-06-05', description: 'Mid-event expense' },
  { id: 'exp4', date: '2023-06-05T12:00:00', description: 'Same day expense' },
  { id: 'exp5', date: '2023-06-10', description: 'End date expense' }
];

const event = {
  id: 'event1',
  name: 'Test Event',
  date: '2023-06-01',
  startDate: '2023-06-01',
  endDate: '2023-06-10',
  createdAt: new Date().toISOString(),
  createdBy: 'user1',
  members: ['user1', 'user2'],
  expenseIds: []
};

// Test positions first
console.log('=== POSITION CALCULATION ===');
expenses.forEach(exp => {
  const pos = calculatePositionPercentage(exp.date, event.startDate, event.endDate);
  console.log(`${exp.id} (${exp.date}): ${pos}%`);
});

console.log('\n=== GROUPING PROCESS ===');
const groups = groupNearbyExpenses(expenses, event);

console.log('\n=== FINAL RESULT ===');
console.log(`Total groups: ${groups.length}`);
groups.forEach((group, index) => {
  console.log(`Group ${index + 1}: ${group.expenses.map(e => e.id).join(', ')} at ${group.position}%`);
});
