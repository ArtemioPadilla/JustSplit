import '@testing-library/jest-dom';
import {
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  groupNearbyExpenses,
  formatTimelineDate,
  formatDateRange
} from '../utils/timelineUtils';
import { Expense, Event } from '../types';

describe('Timeline Utility Functions', () => {
  // Mock data
  const mockEvent: Event = {
    id: 'event1',
    name: 'Test Event',
    date: '2023-06-01',
    startDate: '2023-06-01',
    endDate: '2023-06-10',
    createdAt: '2023-06-01T00:00:00Z',
    createdBy: 'user1',
    members: ['user1', 'user2'],
    expenseIds: []
  };

  const mockExpenses: Expense[] = [
    {
      id: 'exp1',
      eventId: 'event1',
      amount: 100,
      currency: 'USD',
      settled: true,
      date: '2023-05-20',
      description: 'Pre-event expense',
      paidBy: 'user1',
      participants: ['user1'],
      createdAt: '2023-05-20T00:00:00Z'
    },
    {
      id: 'exp2',
      eventId: 'event1',
      amount: 50,
      currency: 'USD',
      settled: false,
      date: '2023-06-01',
      description: 'Start date expense',
      paidBy: 'user1',
      participants: ['user1'],
      createdAt: '2023-06-01T00:00:00Z'
    },
    {
      id: 'exp3',
      eventId: 'event1',
      amount: 200,
      currency: 'USD',
      settled: true,
      date: '2023-06-05',
      description: 'Mid-event expense',
      paidBy: 'user1',
      participants: ['user1'],
      createdAt: '2023-06-05T00:00:00Z'
    },
    {
      id: 'exp4',
      eventId: 'event1',
      amount: 75,
      currency: 'EUR',
      settled: false,
      date: '2023-06-05',
      description: 'Same day expense',
      paidBy: 'user2',
      participants: ['user1', 'user2'],
      createdAt: '2023-06-05T00:00:00Z'
    },
    {
      id: 'exp5',
      eventId: 'event1',
      amount: 25,
      currency: 'USD',
      settled: false,
      date: '2023-06-10',
      description: 'End date expense',
      paidBy: 'user1',
      participants: ['user1', 'user2'],
      createdAt: '2023-06-10T00:00:00Z'
    }
  ];

  describe('calculateSettledPercentage', () => {
    test('returns 0 for an empty array of expenses', () => {
      const percentage = calculateSettledPercentage([]);
      expect(percentage).toBe(0);
    });

    test('calculates correct percentage when all expenses are settled', () => {
      const allSettled = mockExpenses.map(exp => ({ ...exp, settled: true }));
      const percentage = calculateSettledPercentage(allSettled);
      expect(percentage).toBe(100);
    });

    test('calculates correct percentage when no expenses are settled', () => {
      const noneSettled = mockExpenses.map(exp => ({ ...exp, settled: false }));
      const percentage = calculateSettledPercentage(noneSettled);
      expect(percentage).toBe(0);
    });

    test('calculates correct percentage for mixed settled status', () => {
      const percentage = calculateSettledPercentage(mockExpenses);
      // 2 out of 5 expenses are settled (40%)
      expect(percentage).toBe(40);
    });
  });

  describe('calculateTotalByCurrency', () => {
    test('returns empty object for empty expenses array', () => {
      const totals = calculateTotalByCurrency([]);
      expect(totals).toEqual({});
    });

    test('calculates correct totals for multiple currencies', () => {
      const totals = calculateTotalByCurrency(mockExpenses);
      expect(totals['USD']).toBe(375); // 100 + 50 + 200 + 25
      expect(totals['EUR']).toBe(75);
    });
  });

  describe('calculateUnsettledAmount', () => {
    test('returns empty object for empty expenses array', () => {
      const unsettled = calculateUnsettledAmount([]);
      expect(unsettled).toEqual({});
    });

    test('returns empty object when all expenses are settled', () => {
      const allSettled = mockExpenses.map(exp => ({ ...exp, settled: true }));
      const unsettled = calculateUnsettledAmount(allSettled);
      expect(unsettled).toEqual({});
    });

    test('calculates correct unsettled amounts for multiple currencies', () => {
      const unsettled = calculateUnsettledAmount(mockExpenses);
      expect(unsettled['USD']).toBe(75); // 50 + 25
      expect(unsettled['EUR']).toBe(75);
    });
  });

  describe('formatTimelineDate', () => {
    test('formats date correctly', () => {
      const formatted = formatTimelineDate('2023-06-01');
      expect(formatted).toBe('Jun 1, 2023');
    });
  });

  describe('formatDateRange', () => {
    test('formats single date correctly', () => {
      const formatted = formatDateRange('2023-06-01');
      expect(formatted).toBe('6/1/2023');
    });

    test('formats same-day range correctly', () => {
      const formatted = formatDateRange('2023-06-01', '2023-06-01');
      expect(formatted).toBe('6/1/2023');
    });

    test('formats same-month range correctly', () => {
      const formatted = formatDateRange('2023-06-01', '2023-06-15');
      expect(formatted).toBe('Jun 1-15, 2023');
    });

    test('formats same-year range correctly', () => {
      const formatted = formatDateRange('2023-01-01', '2023-02-15');
      expect(formatted).toBe('Jan 1 - Feb 15, 2023');
    });

    test('formats different-year range correctly', () => {
      const formatted = formatDateRange('2022-12-01', '2023-01-15');
      expect(formatted).toBe('12/1/2022 - 1/15/2023');
    });
  });

  describe('groupNearbyExpenses', () => {
    test('groups expenses that are close to each other', () => {
      // Create expenses with very close dates
      const closeExpenses: Expense[] = [
        {
          id: 'exp1',
          amount: 100,
          currency: 'USD',
          date: '2023-06-05T12:00:00',
          description: 'Expense 1',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false,
          createdAt: '2023-06-05T12:00:00Z'
        },
        {
          id: 'exp2',
          amount: 200,
          currency: 'USD',
          date: '2023-06-05T12:30:00', // 30 minutes later
          description: 'Expense 2',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false,
          createdAt: '2023-06-05T12:30:00Z'
        }
      ];
      
      const grouped = groupNearbyExpenses(closeExpenses, mockEvent);
      expect(grouped.length).toBe(1); // Expenses should be grouped together
      expect(grouped[0].expenses.length).toBe(2);
    });
    
    test('keeps separate groups for distant expenses', () => {
      // Create expenses with distant dates
      const distantExpenses: Expense[] = [
        {
          id: 'exp1',
          amount: 100,
          currency: 'USD',
          date: '2023-06-02',
          description: 'Expense 1',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false,
          createdAt: '2023-06-02T00:00:00Z'
        },
        {
          id: 'exp2',
          amount: 200,
          currency: 'USD',
          date: '2023-06-08', // 6 days later
          description: 'Expense 2',
          paidBy: 'user1',
          participants: ['user1'],
          settled: false,
          createdAt: '2023-06-08T00:00:00Z'
        }
      ];
      
      const grouped = groupNearbyExpenses(distantExpenses, mockEvent);
      expect(grouped.length).toBe(2); // Expenses should be in separate groups
      expect(grouped[0].expenses.length).toBe(1);
      expect(grouped[1].expenses.length).toBe(1);
    });
  });
});
