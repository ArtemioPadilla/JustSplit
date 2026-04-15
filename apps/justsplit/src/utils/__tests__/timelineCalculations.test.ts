import {
  calculateTimelineProgress,
  calculatePositionPercentage,
  groupNearbyExpenses,
  formatTimelineDate,
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  TimelineExpense,
  TimelineEvent
} from '../timelineUtils';

describe('Timeline Calculations', () => {
  // Mock dates for testing
  const past = new Date('2025-01-01').toISOString();
  const today = new Date('2025-05-09').toISOString(); // Current date in our context
  const future = new Date('2025-12-31').toISOString();
  
  // Mock event for testing
  const mockEvent: TimelineEvent = {
    id: '1',
    name: 'Test Event',
    startDate: past,
    endDate: future
  };
  
  // Mock expenses for testing
  const mockExpenses: TimelineExpense[] = [
    { id: '1', amount: 100, currency: 'USD', date: past, settled: true },
    { id: '2', amount: 200, currency: 'USD', date: today, settled: false },
    { id: '3', amount: 300, currency: 'EUR', date: future, settled: true },
    { id: '4', amount: 400, currency: 'EUR', date: today, settled: false }
  ];

  describe('calculateTimelineProgress', () => {
    it('should return 0 if event has not started yet', () => {
      const startDate = future; // Event starts in the future
      expect(calculateTimelineProgress(startDate)).toBe(0);
    });

    it('should return 100 if event has ended', () => {
      const startDate = past;
      const endDate = past; // Event ended in the past
      expect(calculateTimelineProgress(startDate, endDate)).toBe(100);
    });

    it('should calculate progress for ongoing event', () => {
      // Mock actual calculation by fixing the "now" date
      const originalDateNow = Date.now;
      global.Date.now = jest.fn(() => new Date('2025-05-09').getTime());
      
      const startDate = past; // Jan 1
      const endDate = future; // Dec 31
      
      // Progress should be about (May 9 - Jan 1) / (Dec 31 - Jan 1) ≈ 35%
      const result = calculateTimelineProgress(startDate, endDate);
      expect(result).toBeGreaterThan(30);
      expect(result).toBeLessThan(40);
      
      // Restore original Date.now
      global.Date.now = originalDateNow;
    });
  });

  describe('calculatePositionPercentage', () => {
    it('should handle pre-event expenses', () => {
      const preEventDate = new Date('2024-12-01').toISOString(); // Before event start
      const position = calculatePositionPercentage(preEventDate, past, future);
      expect(position).toBeLessThan(0); // Should be negative for pre-event
    });

    it('should handle post-event expenses', () => {
      const postEventDate = new Date('2026-01-15').toISOString(); // After event end
      const position = calculatePositionPercentage(postEventDate, past, future);
      expect(position).toBeGreaterThan(100); // Should be >100% for post-event
    });

    it('should handle expenses exactly at start date', () => {
      const position = calculatePositionPercentage(past, past, future);
      expect(position).toBe(1); // Should be slightly offset from 0
    });

    it('should handle expenses exactly at end date', () => {
      const position = calculatePositionPercentage(future, past, future);
      expect(position).toBe(99); // Should be slightly offset from 100
    });

    it('should handle expenses during the event', () => {
      const midEventDate = new Date('2025-07-01').toISOString(); // Middle of the event
      const position = calculatePositionPercentage(midEventDate, past, future);
      expect(position).toBeGreaterThan(45);
      expect(position).toBeLessThan(55);
    });
  });

  describe('groupNearbyExpenses', () => {
    it('should group expenses that are close to each other', () => {
      const closeExpenses: TimelineExpense[] = [
        { id: '1', amount: 100, currency: 'USD', date: today, settled: true },
        { id: '2', amount: 200, currency: 'USD', date: new Date('2025-05-10').toISOString(), settled: false }
      ];
      
      const grouped = groupNearbyExpenses(closeExpenses, mockEvent);
      expect(grouped.length).toBe(1); // Should be grouped into one cluster
      expect(grouped[0].expenses.length).toBe(2);
    });

    it('should keep separate expenses that are far apart', () => {
      const farExpenses: TimelineExpense[] = [
        { id: '1', amount: 100, currency: 'USD', date: past, settled: true },
        { id: '2', amount: 200, currency: 'USD', date: future, settled: false }
      ];
      
      const grouped = groupNearbyExpenses(farExpenses, mockEvent);
      expect(grouped.length).toBe(2); // Should be two separate groups
    });
  });

  describe('calculateSettledPercentage', () => {
    it('should return 0 for empty expenses array', () => {
      expect(calculateSettledPercentage([])).toBe(0);
    });

    it('should calculate correct percentage of settled expenses', () => {
      // 2 out of 4 expenses are settled (50%)
      expect(calculateSettledPercentage(mockExpenses)).toBe(50);
    });

    it('should return 100 when all expenses are settled', () => {
      const allSettled = mockExpenses.map(e => ({ ...e, settled: true }));
      expect(calculateSettledPercentage(allSettled)).toBe(100);
    });

    it('should return 0 when no expenses are settled', () => {
      const noneSettled = mockExpenses.map(e => ({ ...e, settled: false }));
      expect(calculateSettledPercentage(noneSettled)).toBe(0);
    });
  });

  describe('calculateTotalByCurrency', () => {
    it('should return empty object for empty expenses array', () => {
      expect(calculateTotalByCurrency([])).toEqual({});
    });

    it('should calculate correct totals by currency', () => {
      const result = calculateTotalByCurrency(mockExpenses);
      expect(result).toEqual({ USD: 300, EUR: 700 });
    });
  });

  describe('calculateUnsettledAmount', () => {
    it('should return empty object for empty expenses array', () => {
      expect(calculateUnsettledAmount([])).toEqual({});
    });

    it('should calculate correct unsettled amounts by currency', () => {
      const result = calculateUnsettledAmount(mockExpenses);
      // Only the unsettled expenses (id 2 and 4) should be counted
      expect(result).toEqual({ USD: 200, EUR: 400 });
    });

    it('should return empty object when all expenses are settled', () => {
      const allSettled = mockExpenses.map(e => ({ ...e, settled: true }));
      expect(calculateUnsettledAmount(allSettled)).toEqual({});
    });
  });

  describe('formatTimelineDate', () => {
    it('should format date correctly', () => {
      expect(formatTimelineDate(past)).toContain('Jan 1, 2025');
      expect(formatTimelineDate(today)).toContain('May 9, 2025');
    });
  });
});