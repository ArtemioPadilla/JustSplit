import '@testing-library/jest-dom';

// Mock implementation of calculatePositionPercentage to test post-event expenses
const calculatePositionPercentage = (date: string, startDate: string, endDate?: string): number => {
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
  
  // Other cases (same as before)
  if (Math.abs(targetDate - start) < 1000 * 60 * 60) return 1;
  if (endDate && Math.abs(targetDate - end) < 1000 * 60 * 60) return 99;
  if (targetDate >= start && (!endDate || targetDate <= end)) {
    return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
  }
  
  return 100;
};

describe('Post-Event Expense Position Calculation', () => {
  test('calculates position for post-event expenses correctly', () => {
    const startDate = '2023-06-01';
    const endDate = '2023-06-10';
    const expenseDate = '2023-06-20'; // 10 days after end
    
    const position = calculatePositionPercentage(expenseDate, startDate, endDate);
    
    // Position should be > 100% for post-event expenses
    expect(position).toBeGreaterThan(100);
    
    // For an expense 10 days after a 30-day max window, should be around (10/30)*20 = ~6.7% after 100%
    expect(position).toBeCloseTo(106.7, 1);
  });
  
  test('caps position at 120% for very late post-event expenses', () => {
    const startDate = '2023-06-01';
    const endDate = '2023-06-10';
    const expenseDate = '2023-08-01'; // Much later (well beyond 30 days)
    
    const position = calculatePositionPercentage(expenseDate, startDate, endDate);
    
    // Should be capped at 120%
    expect(position).toBe(120);
  });
  
  test('handles edge cases correctly', () => {
    const startDate = '2023-06-01';
    const endDate = '2023-06-10';
    
    // Expense exactly 1 hour after end date
    const justAfterEnd = new Date(new Date(endDate).getTime() + 60 * 60 * 1000).toISOString();
    const positionJustAfter = calculatePositionPercentage(justAfterEnd, startDate, endDate);
    
    // Should be slightly after 100%
    expect(positionJustAfter).toBeGreaterThan(100);
    expect(positionJustAfter).toBeLessThan(102); // Should be close to 100%
  });
});
