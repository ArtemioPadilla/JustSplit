import { render, screen } from '@testing-library/react';
import Home from '../page';

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

describe('Home', () => {
  it('renders heading and description', () => {
    render(<Home />);
    
    // Check heading
    expect(screen.getByRole('heading', { name: /JustSplit/i })).toBeInTheDocument();
    
    // Check description text
    expect(screen.getByText(/Fair expense splitting, made simple./i)).toBeInTheDocument();
    expect(screen.getByText(/Track, divide, and settle shared expenses effortlessly/i)).toBeInTheDocument();
  });

  it('renders the action buttons', () => {
    render(<Home />);
    
    // Check buttons
    const addExpenseButton = screen.getByText('Add Expense');
    const createEventButton = screen.getByText('Create Event');
    
    expect(addExpenseButton).toBeInTheDocument();
    expect(createEventButton).toBeInTheDocument();
    
    // Check button links
    expect(addExpenseButton.closest('a')).toHaveAttribute('href', '/expenses/new');
    expect(createEventButton.closest('a')).toHaveAttribute('href', '/events/new');
  });
});
