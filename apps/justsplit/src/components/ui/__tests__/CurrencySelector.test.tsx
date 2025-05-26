import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CurrencySelector from '../CurrencySelector';
import { SUPPORTED_CURRENCIES } from '../../../utils/currencyExchange';

// Mock the AppContext hook
jest.mock('../../../context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    preferredCurrency: 'USD',
    setPreferredCurrency: jest.fn(),
  })),
}));

describe('CurrencySelector', () => {
  it('renders correctly with default props', () => {
    render(<CurrencySelector />);
    
    expect(screen.getByLabelText(/Currency:/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('USD');
    expect(screen.queryByTitle('Refresh exchange rates')).not.toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<CurrencySelector label="Convert to:" />);
    
    expect(screen.getByLabelText(/Convert to:/i)).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    render(<CurrencySelector compact={true} />);
    
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    
    // Check if all currency options are present
    SUPPORTED_CURRENCIES.forEach(currency => {
      const optionText = `${currency.code} (${currency.symbol})`;
      const options = screen.getAllByRole('option');
      const foundOption = options.find(option => option.textContent === optionText);
      expect(foundOption).toBeInTheDocument();
    });
  });

  it('shows refresh button when showRefreshButton is true', () => {
    render(<CurrencySelector showRefreshButton={true} />);
    
    expect(screen.getByTitle('Refresh exchange rates')).toBeInTheDocument();
  });

  it('calls onChange when a new currency is selected', () => {
    const handleChange = jest.fn();
    render(<CurrencySelector value="USD" onChange={handleChange} />);
    
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'EUR' } });
    
    expect(handleChange).toHaveBeenCalledWith('EUR');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const handleRefresh = jest.fn();
    render(<CurrencySelector showRefreshButton={true} onRefresh={handleRefresh} />);
    
    fireEvent.click(screen.getByTitle('Refresh exchange rates'));
    
    expect(handleRefresh).toHaveBeenCalled();
  });

  it('is disabled when isRefreshing is true', () => {
    render(<CurrencySelector isRefreshing={true} />);
    
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
  
  it('applies custom className', () => {
    render(<CurrencySelector className="custom-class" />);
    
    expect(screen.getByTestId('currency-selector-container')).toHaveClass('custom-class');
  });
});
