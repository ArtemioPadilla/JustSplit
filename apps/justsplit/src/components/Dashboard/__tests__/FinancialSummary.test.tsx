import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import FinancialSummary from '../FinancialSummary';

// Mock the formatCurrency utility
jest.mock('../../../utils/formatters', () => ({
  formatCurrency: (amount: number, currency: string) => {
    if (amount === 0) return `-- ${currency}`;
    return `${amount} ${currency}`;
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const defaultProps = {
  totalSpent: 1250.75,
  unsettledCount: 3,
  totalPendingAmount: 150.50,
  preferredCurrency: 'USD',
  isConvertingCurrencies: false,
  compareWithLastMonth: 250.25,
  activeEvents: 5,
  activeParticipants: 10,
  inactiveParticipants: 2,
  youOwe: 75.20,
  othersOwe: 120.80,
  mostExpensiveCategory: { name: 'Food', amount: 450.00 },
  highestExpense: 180.00,
  avgPerDay: 41.69,
};

describe('FinancialSummary', () => {
  it('renders financial summary with data correctly', () => {
    renderWithAppContext(<FinancialSummary {...defaultProps} />);
    
    // Check for block titles
    expect(screen.getByText('Period Summary')).toBeInTheDocument();
    expect(screen.getByText('Balance Situation')).toBeInTheDocument();
    expect(screen.getByText('Your Insights')).toBeInTheDocument();
    
    // Check Period Summary metrics
    expect(screen.getByText(`Total this ${new Date().toLocaleString('default', { month: 'long' })}`)).toBeInTheDocument();
    expect(screen.getByText('Active Events')).toBeInTheDocument();
    expect(screen.getByText('Active Participants')).toBeInTheDocument();
    
    // Check Balance Situation metrics
    expect(screen.getByText('You Owe')).toBeInTheDocument();
    expect(screen.getByText('Owed to You')).toBeInTheDocument();
    expect(screen.getByText(/Net Balance:/)).toBeInTheDocument();
    
    // Check Your Insights metrics
    expect(screen.getByText('Highest Expense')).toBeInTheDocument();
    expect(screen.getByText('Top Category')).toBeInTheDocument();
    expect(screen.getByText('Daily Average (30 days)')).toBeInTheDocument();
    
  });

  it('renders message when no expense data is available', () => {
    const noDataProps = {
      ...defaultProps,
      totalSpent: 0,
      unsettledCount: 0,
      totalPendingAmount: 0,
    };
    
    renderWithAppContext(<FinancialSummary {...noDataProps} />);
    
    // Check for no expense message
    expect(screen.getByText('No expenses recorded this month. Add your first expense to start tracking!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Expense' })).toBeInTheDocument();
  });
  
  it('displays various financial KPIs', () => {
    renderWithAppContext(<FinancialSummary {...defaultProps} />);
    
    // Check for the different metrics in the component
    expect(screen.getByText('Active Events')).toBeInTheDocument();
    expect(screen.getByText(`${defaultProps.activeEvents}`)).toBeInTheDocument();
    
    expect(screen.getByText('Active Participants')).toBeInTheDocument();
    expect(screen.getByText(`${defaultProps.activeParticipants}`)).toBeInTheDocument();
    expect(screen.getByText(`${defaultProps.inactiveParticipants} haven't added expenses`)).toBeInTheDocument();
    
    // Check comparison with last month is displayed
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toLocaleString('default', { month: 'long' });
    expect(screen.getByText(new RegExp(`vs ${lastMonth}`))).toBeInTheDocument();
  });
});
