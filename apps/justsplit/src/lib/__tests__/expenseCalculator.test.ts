import { calculateEqualSplit, calculateBalances, Expense, Participant } from '../expenseCalculator';

describe('expenseCalculator', () => {
  // Test data
  const participants: Participant[] = [
    { id: 'user1', name: 'Alice' },
    { id: 'user2', name: 'Bob' },
    { id: 'user3', name: 'Charlie' }
  ];

  const expense: Expense = {
    id: 'exp1',
    description: 'Dinner',
    amount: 300,
    currency: 'USD',
    paidBy: 'user1',
    participants: ['user1', 'user2', 'user3'],
    date: new Date('2023-01-01')
  };

  describe('calculateEqualSplit', () => {
    it('should divide expense amount equally among participants', () => {
      const result = calculateEqualSplit(expense);
      expect(result).toBe(100); // 300 / 3 = 100
    });

    it('should handle uneven divisions by providing exact division', () => {
      const unevenExpense: Expense = {
        ...expense,
        amount: 100,
      };
      const result = calculateEqualSplit(unevenExpense);
      expect(result).toBe(33.333333333333336); // 100 / 3 = 33.33...
    });
  });

  describe('calculateBalances', () => {
    it('should calculate correct balances for a single expense', () => {
      const expenses = [expense];
      const balances = calculateBalances(expenses, participants);

      // Alice paid 300, but owes 100 for her share, so net +200
      // Bob and Charlie each owe 100, so they should pay Alice

      expect(balances).toHaveLength(2);
      expect(balances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ from: 'user2', to: 'user1', amount: 100 }),
          expect.objectContaining({ from: 'user3', to: 'user1', amount: 100 })
        ])
      );
    });

    it('should calculate balances for multiple expenses with different payers', () => {
      const secondExpense: Expense = {
        id: 'exp2',
        description: 'Taxi',
        amount: 60,
        currency: 'USD',
        paidBy: 'user2',
        participants: ['user1', 'user2', 'user3'],
        date: new Date('2023-01-01')
      };

      const expenses = [expense, secondExpense];
      const balances = calculateBalances(expenses, participants);

      // Alice paid 300, owes 100 for first expense, and 20 for second expense, net +180
      // Bob paid 60, owes 100 for first expense, and 20 for second expense, net -60
      // Charlie owes 100 + 20 = 120, net -120
      // So Bob pays 60 to Alice and Charlie pays 120 to Alice

      expect(balances).toHaveLength(2);
      expect(balances).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ from: 'user2', to: 'user1', amount: 60 }),
          expect.objectContaining({ from: 'user3', to: 'user1', amount: 120 })
        ])
      );
    });

    it('should handle the case when balances are settled (no one owes anything)', () => {
      const settledExpense: Expense = {
        id: 'exp3',
        description: 'Lunch',
        amount: 90,
        currency: 'USD',
        paidBy: 'user1',
        participants: ['user1', 'user2', 'user3'],
        date: new Date('2023-01-01')
      };

      const participants = [
        { id: 'user1', name: 'Alice' },
        { id: 'user2', name: 'Bob' },
        { id: 'user3', name: 'Charlie' }
      ];

      // Everyone pays exactly their share, so all balances should be 0
      const expenses = [
        {
          ...settledExpense,
          paidBy: 'user1',
          amount: 30,
        },
        {
          ...settledExpense,
          id: 'exp4',
          paidBy: 'user2',
          amount: 30,
        },
        {
          ...settledExpense,
          id: 'exp5',
          paidBy: 'user3',
          amount: 30,
        }
      ];

      const balances = calculateBalances(expenses, participants);
      expect(balances).toHaveLength(0);
    });
  });
});
