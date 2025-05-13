import { render, screen } from '@testing-library/react';
import ExpenseDistribution from '../ExpenseDistribution';

describe('ExpenseDistribution', () => {
  const mockCategoryDistribution = [
    { name: 'Food', amount: 200, percentage: 40 },
    { name: 'Transport', amount: 150, percentage: 30 },
    { name: 'Entertainment', amount: 100, percentage: 20 },
    { name: 'Other', amount: 50, percentage: 10 }
  ];

  it('renders expense distribution correctly with data', async () => {
    render(<ExpenseDistribution categoryDistribution={mockCategoryDistribution} isConvertingCurrencies={false} />);
    await screen.findByText('Expense Distribution');
    // Check if categories are displayed
    await screen.findByText('Food');
    await screen.findByText('Transport');
    await screen.findByText('Entertainment');
    await screen.findByText('Other');
    // Check formatted amounts and percentages using custom matcher for split text
    expect(screen.getByText((content, node) => node.textContent === 'USD 200.00 (40.0%)')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node.textContent === 'USD 150.00 (30.0%)')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node.textContent === 'USD 100.00 (20.0%)')).toBeInTheDocument();
    expect(screen.getByText((content, node) => node.textContent === 'USD 50.00 (10.0%)')).toBeInTheDocument();
  });

  it('handles empty data correctly', async () => {
    render(<ExpenseDistribution categoryDistribution={[]} isConvertingCurrencies={false} />);
    await screen.findByText('Expense Distribution');
    await screen.findByText('No expenses to categorize');
  });

  it('displays correct number of categories (max 5)', async () => {
    // Create array with 6 categories
    const manyCategories = [
      ...mockCategoryDistribution,
      { name: 'Shopping', amount: 30, percentage: 6 },
      { name: 'Bills', amount: 25, percentage: 5 }
    ];
    render(<ExpenseDistribution categoryDistribution={manyCategories} isConvertingCurrencies={false} />);
    await screen.findByText('Food');
    await screen.findByText('Transport');
    await screen.findByText('Entertainment');
    await screen.findByText('Other');
    await screen.findByText('Shopping');
    // The 6th category shouldn't be displayed
    expect(screen.queryByText('Bills')).not.toBeInTheDocument();
  });
});
