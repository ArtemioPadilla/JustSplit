import { render, screen } from '@testing-library/react';
import ExpenseDistribution from '../ExpenseDistribution';

describe('ExpenseDistribution', () => {
  const mockCategoryDistribution = [
    { name: 'Food', amount: 200, percentage: 40 },
    { name: 'Transport', amount: 150, percentage: 30 },
    { name: 'Entertainment', amount: 100, percentage: 20 },
    { name: 'Other', amount: 50, percentage: 10 }
  ];

  it('renders expense distribution correctly with data', () => {
    render(<ExpenseDistribution categoryDistribution={mockCategoryDistribution} />);
    
    expect(screen.getByText('Expense Distribution')).toBeInTheDocument();
    
    // Check if categories are displayed
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    
    // Check formatted amounts and percentages
    expect(screen.getByText('$200.00 (40.0%)')).toBeInTheDocument();
    expect(screen.getByText('$150.00 (30.0%)')).toBeInTheDocument();
    expect(screen.getByText('$100.00 (20.0%)')).toBeInTheDocument();
    expect(screen.getByText('$50.00 (10.0%)')).toBeInTheDocument();
  });

  it('handles empty data correctly', () => {
    render(<ExpenseDistribution categoryDistribution={[]} />);
    
    expect(screen.getByText('Expense Distribution')).toBeInTheDocument();
    expect(screen.getByText('No expenses to categorize')).toBeInTheDocument();
  });

  it('displays correct number of categories (max 5)', () => {
    // Create array with 6 categories
    const manyCategories = [
      ...mockCategoryDistribution,
      { name: 'Shopping', amount: 30, percentage: 6 },
      { name: 'Bills', amount: 25, percentage: 5 }
    ];
    
    render(<ExpenseDistribution categoryDistribution={manyCategories} />);
    
    // Should only display first 5 categories
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Shopping')).toBeInTheDocument();
    
    // The 6th category shouldn't be displayed
    expect(screen.queryByText('Bills')).not.toBeInTheDocument();
  });
});
