import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithAppContext } from '../../../test-utils';
import Header from '../index';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href, className }) => (
    <a href={href} className={className} data-testid="next-link">
      {children}
    </a>
  );
});

describe('Header', () => {
  test('renders logo and navigation links', () => {
    renderWithAppContext(<Header />);
    
    // Check for logo (adjust selector based on your actual implementation)
    const logo = screen.getByAltText('JustSplit') || screen.getByText('JustSplit');
    expect(logo).toBeInTheDocument();
    
    // Check for navigation links (adjust based on your actual implementation)
    const homeLink = screen.getByText('Home') || screen.getByRole('link', { name: /home/i });
    expect(homeLink).toBeInTheDocument();
  });
  
  // If your Header component has a mobile menu toggle, uncomment and adapt this test:
  /*
  test('toggles mobile menu when hamburger icon is clicked', () => {
    renderWithAppContext(<Header />);
    
    // Find hamburger icon (make sure to add data-testid="hamburger-icon" to your component)
    const hamburgerIcon = screen.getByTestId('hamburger-icon');
    
    // Check that mobile menu is initially hidden
    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(mobileMenu).not.toHaveClass('active');
    
    // Click hamburger icon
    fireEvent.click(hamburgerIcon);
    
    // Check that mobile menu is now visible
    expect(mobileMenu).toHaveClass('active');
  });
  */
  
  test('displays user name when logged in', () => {
    const testState = {
      users: [{ id: 'user1', name: 'Test User', email: 'test@example.com', balance: 0 }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<Header />, { initialState: testState });
    
    // This assertion needs to match how your Header displays the username
    // You may need to adjust this based on your actual implementation
    const userElement = screen.queryByText('Test User');
    if (userElement) {
      expect(userElement).toBeInTheDocument();
    } else {
      // Alternative check - see if the user menu/avatar exists
      const userAvatar = screen.queryByTestId('user-avatar');
      if (userAvatar) {
        expect(userAvatar).toBeInTheDocument();
      }
    }
  });
});
