import { calculateSettlements, calculateSettlementsWithConversion } from '../expenseCalculator';
import * as currencyExchange from '../currencyExchange';

// Mock the currency exchange module
jest.mock('../currencyExchange', () => ({
  getExchangeRate: jest.fn().mockResolvedValue({ rate: 1.5, isFallback: false }),
  convertCurrency: jest.fn().mockImplementation((amount) => 
    Promise.resolve({ convertedAmount: amount * 1.5, isFallback: false }))
}));

describe('Expense Calculator', () => {
  describe('calculateSettlements', () => {
    it('should return empty array for no expenses', () => {
      const result = calculateSettlements([], []);
      expect(result).toEqual([]);
    });

    it('should calculate settlements for simple expenses', () => {
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];

      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          createdAt: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        }
      ];

      const result = calculateSettlements(expenses, users);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        fromUser: 'user2',
        toUser: 'user1',
        amount: 50,
        expenseIds: ['exp1']
      }));
    });

    it('should ignore settled expenses', () => {
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];

      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          createdAt: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: true
        }
      ];

      const result = calculateSettlements(expenses, users);
      expect(result).toHaveLength(0);
    });

    it('should handle multiple expenses with circular debts', () => {
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 },
        { id: 'user3', name: 'Charlie', balance: 0 }
      ];

      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 60,
          currency: 'USD',
          date: '2023-01-01',
          createdAt: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2', 'user3'],
          settled: false
        },
        {
          id: 'exp2',
          description: 'Dinner',
          amount: 90,
          currency: 'USD',
          date: '2023-01-02',
          createdAt: '2023-01-02',
          paidBy: 'user2',
          participants: ['user1', 'user2', 'user3'],
          settled: false
        },
        {
          id: 'exp3',
          description: 'Breakfast',
          amount: 30,
          currency: 'USD',
          date: '2023-01-03',
          createdAt: '2023-01-03',
          paidBy: 'user3',
          participants: ['user1', 'user2', 'user3'],
          settled: false
        }
      ];

      const result = calculateSettlements(expenses, users);
      
      // Check the total amount of settlements equals the imbalance
      const totalSettlementAmount = result.reduce((sum, s) => sum + s.amount, 0);
      
      // Total expenses: 60 + 90 + 30 = 180
      // Each person's fair share: 180 / 3 = 60
      // User1 paid 60, should get 0
      // User2 paid 90, should get 30
      // User3 paid 30, should pay 30
      // So total settlement amount should be 30
      
      expect(totalSettlementAmount).toBeCloseTo(30);
      
      // Verify the settlement directions make sense
      const user3Settlements = result.filter(s => s.fromUser === 'user3');
      expect(user3Settlements.length).toBeGreaterThan(0);
      
      const totalUser3Pays = user3Settlements.reduce((sum, s) => sum + s.amount, 0);
      expect(totalUser3Pays).toBeCloseTo(30);
    });

    it('should filter by event ID if provided', () => {
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];

      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          createdAt: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          eventId: 'event1'
        },
        {
          id: 'exp2',
          description: 'Dinner',
          amount: 200,
          currency: 'USD',
          date: '2023-01-02',
          createdAt: '2023-01-02',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false,
          eventId: 'event2'
        }
      ];

      const resultEvent1 = calculateSettlements(expenses, users, 'event1');
      expect(resultEvent1).toHaveLength(1);
      expect(resultEvent1[0].amount).toBe(50);
      expect(resultEvent1[0].expenseIds).toEqual(['exp1']);

      const resultEvent2 = calculateSettlements(expenses, users, 'event2');
      expect(resultEvent2).toHaveLength(1);
      expect(resultEvent2[0].amount).toBe(100);
      expect(resultEvent2[0].expenseIds).toEqual(['exp2']);
    });
  });

  describe('calculateSettlementsWithConversion', () => {
    it('should convert currencies when calculating settlements', async () => {
      const users = [
        { id: 'user1', name: 'Alice', balance: 0 },
        { id: 'user2', name: 'Bob', balance: 0 }
      ];

      const expenses = [
        {
          id: 'exp1',
          description: 'Lunch',
          amount: 100,
          currency: 'USD',
          date: '2023-01-01',
          createdAt: '2023-01-01',
          paidBy: 'user1',
          participants: ['user1', 'user2'],
          settled: false
        },
        {
          id: 'exp2',
          description: 'Dinner',
          amount: 100,
          currency: 'EUR',
          date: '2023-01-02',
          createdAt: '2023-01-02',
          paidBy: 'user2',
          participants: ['user1', 'user2'],
          settled: false
        }
      ];

      // When converting to USD, EUR amount should be multiplied by 1.5 (from our mock)
      // So EUR 100 becomes USD 150
      const result = await calculateSettlementsWithConversion(expenses, users, 'USD');
      
      // Expected: 
      // - user1 paid USD 100, fair share is (100 + 150) / 2 = 125, so user1 underpaid by 25
      // - user2 paid EUR 100 (USD 150), fair share is 125, so user2 overpaid by 25
      // So user1 should pay user2 USD 25
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        fromUser: 'user1',
        toUser: 'user2',
        amount: 25,
        expenseIds: ['exp1', 'exp2']
      }));

      // Verify that convertCurrency was called with the right parameters
      expect(currencyExchange.convertCurrency).toHaveBeenCalledWith(100, 'EUR', 'USD');
    });
  });
});
