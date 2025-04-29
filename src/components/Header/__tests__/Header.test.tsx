import { render, screen } from '@testing-library/react';
import Header from '../index';

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
});

describe('Header', () => {
  it('renders the logo and navigation links', () => {
    render(<Header />);
    
    // Check logo
    expect(screen.getByText('JustSplit')).toBeInTheDocument();
    
    // Check navigation links
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Settlements')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('highlights the current page in navigation', () => {
    render(<Header currentPage="events" />);
    
    // Get all navigation links
    const homeLink = screen.getByText('Home').closest('a');
    const eventsLink = screen.getByText('Events').closest('a');
    
    // Check that only the events link has the active class
    expect(homeLink).not.toHaveClass('active');
    expect(eventsLink).toHaveClass('active');
  });

  it('defaults to highlighting home when no currentPage is provided', () => {
    render(<Header />);
    
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveClass('active');
  });
});
