import { render, screen } from '@testing-library/react';
import FinancialSummary from '../FinancialSummary';

describe('FinancialSummary', () => {
  it('renders financial statistics correctly', () => {
    const props = {
      totalSpent: 1500.50,
      unsettledCount: 5,
      totalPendingAmount: 750.25
    };

    render(<FinancialSummary {...props} />);
    
    expect(screen.getByText('Financial Overview')).toBeInTheDocument();
    
    // Check values are formatted and displayed correctly
    expect(screen.getByText('$1500.50')).toBeInTheDocument();
    expect(screen.getByText('Total Tracked')).toBeInTheDocument();
    
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Unsettled Expenses')).toBeInTheDocument();
    
    expect(screen.getByText('$750.25')).toBeInTheDocument();
    expect(screen.getByText('Pending Settlements')).toBeInTheDocument();
  });

  it('renders with zero values correctly', () => {
    const props = {
      totalSpent: 0,
      unsettledCount: 0,
      totalPendingAmount: 0
    };

    render(<FinancialSummary {...props} />);
    
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('renders all stat icons correctly', () => {
    const props = {
      totalSpent: 100,
      unsettledCount: 2,
      totalPendingAmount: 50
    };

    render(<FinancialSummary {...props} />);
    
    // Check for emoji icons
    expect(screen.getByText('💰')).toBeInTheDocument();
    expect(screen.getByText('📝')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });
});
