import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../index';
import { useAppContext } from '../../../context/AppContext';

// Mock the AppContext
jest.mock('../../../context/AppContext', () => ({
  useAppContext: jest.fn(),
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock Next.js usePathname hook
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: jest.fn().mockReturnValue('/'),
}));

describe('Header Component', () => {
  beforeEach(() => {
    // Set up the mock to return a default state
    (useAppContext as jest.Mock).mockReturnValue({
      state: {
        users: [],
        expenses: [],
        events: [],
        settlements: []
      }
    });
  });

  it('renders the header with logo', () => {
    render(<Header />);
    const logo = screen.getByText('JustSplit');
    expect(logo).toBeInTheDocument();
  });

  it('shows navigation links', () => {
    render(<Header />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger icon is clicked', () => {
    render(<Header />);
    
    // Mobile menu should be hidden initially
    const mobileMenu = screen.queryByRole('navigation');
    expect(mobileMenu).toHaveClass('mobileMenuHidden');
    
    // Click the hamburger icon
    const hamburgerButton = screen.getByLabelText('Toggle menu');
    fireEvent.click(hamburgerButton);
    
    // Menu should now be visible
    expect(mobileMenu).toHaveClass('mobileMenuVisible');
    
    // Click again to hide
    fireEvent.click(hamburgerButton);
    expect(mobileMenu).toHaveClass('mobileMenuHidden');
  });

  it('highlights the active navigation item based on current path', () => {
    // Mock the usePathname to return '/expenses'
    const usePathnameMock = require('next/navigation').usePathname;
    usePathnameMock.mockReturnValue('/expenses');
    
    render(<Header />);
    
    // The Expenses link should have the active class
    const expensesLink = screen.getByText('Expenses').closest('a');
    expect(expensesLink).toHaveClass('active');
    
    // Dashboard link should not have the active class
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).not.toHaveClass('active');
  });
});
