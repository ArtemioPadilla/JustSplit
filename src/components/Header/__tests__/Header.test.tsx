import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../index';
import { renderWithAppContext } from '../../../test-utils';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/'
}));

// Mock next/link - pass through all props, not just children and href
jest.mock('next/link', () => {
  return ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock next/image - store the onError callback to call it directly
jest.mock('next/image', () => {
  return ({ src, alt, width, height, className, onError, priority }: any) => {
    // Call onError directly to simulate image loading failure
    if (onError && src.includes('justsplit-logo')) {
      // Use setTimeout to ensure this happens after component mount
      setTimeout(() => onError(), 0);
    }
    
    return <img 
      src={src} 
      alt={alt} 
      width={width} 
      height={height} 
      className={className}
      data-testid="logo-image"
    />;
  };
});

describe('Header', () => {
  test('renders logo and navigation links', () => {
    renderWithAppContext(<Header />);
    
    // Check for logo
    const logo = screen.getByTestId('logo-image');
    expect(logo).toBeInTheDocument();
    
    // Check for navigation links
    expect(screen.getByText(/home/i)).toBeInTheDocument();
    expect(screen.getByText(/expenses/i)).toBeInTheDocument();
    expect(screen.getByText(/events/i)).toBeInTheDocument();
    expect(screen.getByText(/friends/i)).toBeInTheDocument();
    expect(screen.getByText(/settlements/i)).toBeInTheDocument();
  });
  
  test('displays user name when logged in', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Test User', email: 'test@example.com' }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<Header />, { initialState });
    
    const userElement = screen.getByTestId('user-profile');
    expect(userElement).toBeInTheDocument();
    expect(userElement.textContent).toContain('Test User');
  });

  test('displays Profile link when not logged in', () => {
    const initialState = {
      users: [], // Empty users array means no logged in user
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<Header />, { initialState });
    
    // Should show 'Profile' link instead of user profile
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  test('shows text logo when image fails to load', async () => {
    renderWithAppContext(<Header />);
    
    // The mock will automatically trigger the error
    // Wait for the text to appear
    const logoText = await screen.findByText('JustSplit');
    expect(logoText).toBeInTheDocument();
  });
});
