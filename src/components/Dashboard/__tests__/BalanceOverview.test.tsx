import { render, screen } from '@testing-library/react';
import BalanceOverview from '../BalanceOverview';

describe('BalanceOverview', () => {
  const mockBalanceDistribution = [
    { userId: 'user1', name: 'Alice', balance: 150.75 },
    { userId: 'user2', name: 'Bob', balance: -75.50 },
    { userId: 'user3', name: 'Charlie', balance: 0 },
    { userId: 'user4', name: 'David', balance: -25.25 }
  ];

  it('renders balance overview correctly with data', () => {
    render(<BalanceOverview balanceDistribution={mockBalanceDistribution} />);
    
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    
    // Check if user names are displayed
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('David')).toBeInTheDocument();
    
    // Check formatted balances
    expect(screen.getByText('150.75')).toBeInTheDocument();
    expect(screen.getByText('-75.50')).toBeInTheDocument();
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText('-25.25')).toBeInTheDocument();
  });

  it('handles empty data correctly', () => {
    render(<BalanceOverview balanceDistribution={[]} />);
    
    expect(screen.getByText('Balance Overview')).toBeInTheDocument();
    expect(screen.getByText('No balance data available')).toBeInTheDocument();
  });

  it('applies correct CSS classes for positive and negative balances', () => {
    render(<BalanceOverview balanceDistribution={mockBalanceDistribution} />);
    
    // Check that Alice's positive balance has the positive class
    const positiveBalance = screen.getByText('150.75').closest('div');
    expect(positiveBalance).toHaveClass('positive');
    
    // Check that Bob's negative balance has the negative class
    const negativeBalance = screen.getByText('-75.50').closest('div');
    expect(negativeBalance).toHaveClass('negative');
    
    // Check that Charlie's zero balance has neither class
    const zeroBalance = screen.getByText('0.00').closest('div');
    expect(zeroBalance).not.toHaveClass('positive');
    expect(zeroBalance).not.toHaveClass('negative');
  });
});
