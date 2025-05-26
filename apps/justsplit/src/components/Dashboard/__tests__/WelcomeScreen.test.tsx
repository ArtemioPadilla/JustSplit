import { render, screen } from '@testing-library/react';
import WelcomeScreen from '../WelcomeScreen';

// Mock Next.js Link component
jest.mock('next/link', () => {
  const LinkComponent = ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  LinkComponent.displayName = 'Link';
  return LinkComponent;
});

describe('WelcomeScreen', () => {
  it('renders welcome message correctly', () => {
    render(<WelcomeScreen />);
    
    expect(screen.getByText('JustSplit')).toBeInTheDocument();
    expect(screen.getByText('Fair expense splitting, made simple.')).toBeInTheDocument();
    expect(screen.getByText('Track, divide, and settle shared expenses effortlessly — for trips, events, or daily life.')).toBeInTheDocument();
  });

  it('renders action buttons with correct links', () => {
    render(<WelcomeScreen />);
    
    const addExpenseButton = screen.getByText('Add Expense');
    const createEventButton = screen.getByText('Create Event');
    
    expect(addExpenseButton).toBeInTheDocument();
    expect(addExpenseButton.closest('a')).toHaveAttribute('href', '/expenses/new');
    
    expect(createEventButton).toBeInTheDocument();
    expect(createEventButton.closest('a')).toHaveAttribute('href', '/events/new');
  });
});
