import { groupNearbyExpenses, calculatePositionPercentage } from '../utils/timelineUtils/index';

describe('Debug Grouping Algorithm', () => {
  test('debug grouping with console output', () => {
    const expenses = [
      { id: 'exp1', date: '2023-05-20', description: 'Pre-event expense', amount: 100, currency: 'USD', paidBy: 'user1', participants: ['user1'], eventId: 'event1', settled: false, category: 'Food', createdAt: '2023-05-20T00:00:00Z' },
      { id: 'exp2', date: '2023-06-01', description: 'Start date expense', amount: 50, currency: 'USD', paidBy: 'user1', participants: ['user1'], eventId: 'event1', settled: false, category: 'Transport', createdAt: '2023-06-01T00:00:00Z' },
      { id: 'exp3', date: '2023-06-05', description: 'Mid-event expense', amount: 200, currency: 'USD', paidBy: 'user1', participants: ['user1'], eventId: 'event1', settled: true, category: 'Food', createdAt: '2023-06-05T00:00:00Z' },
      { id: 'exp4', date: '2023-06-05T12:00:00', description: 'Same day expense', amount: 75, currency: 'EUR', paidBy: 'user2', participants: ['user1', 'user2'], eventId: 'event1', settled: false, category: 'Entertainment', createdAt: '2023-06-05T12:00:00Z' },
      { id: 'exp5', date: '2023-06-10', description: 'End date expense', amount: 25, currency: 'USD', paidBy: 'user1', participants: ['user1', 'user2'], eventId: 'event1', settled: false, category: 'Food', createdAt: '2023-06-10T00:00:00Z' }
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

    // Calculate positions to see what they are
    const positions = expenses.map(exp => {
      const pos = calculatePositionPercentage(exp.date, event.startDate, event.endDate);
      return { id: exp.id, date: exp.date, position: pos };
    });

    console.log('POSITIONS:', JSON.stringify(positions, null, 2));

    // Run grouping
    const groups = groupNearbyExpenses(expenses, event);
    
    console.log('GROUPS:', JSON.stringify(groups.map(g => ({
      position: g.position,
      expenses: g.expenses.map(e => ({ id: e.id, date: e.date }))
    })), null, 2));

    // The test should fail so we can see the console output
    expect(groups.length).toBeGreaterThanOrEqual(3);
  });
});
