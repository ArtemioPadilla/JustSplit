import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import Header from '../index';
import { renderWithProviders } from '../../../test-utils';
import { AppState } from '../../../context/AppContext'; // Import AppState

describe('Header', () => {
  test('renders logo and navigation links', () => {
    renderWithProviders(<Header />);
    
    // Check for logo (using alt text instead of data-testid)
    const logo = screen.getByAltText('JustSplit Logo');
    expect(logo).toBeInTheDocument();
    
    // Check for navigation links for non-authenticated user (landing page links)
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('displays user name when logged in', () => {
    const loggedInUser = {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://example.com/photo.jpg',
      preferredCurrency: 'USD',
      balance: 0,
    };
    
    // This is the initial state for AppContext
    const initialAppState: Partial<AppState> = {
      currentUser: loggedInUser,
      users: [loggedInUser],
      expenses: [],
      events: [],
      settlements: [],
      isDataLoaded: true,
    };

    renderWithProviders(<Header />, { 
      initialState: initialAppState, // Pass the AppState portion
    });
    
    // Check that the user's name is displayed
    // The Header component displays currentUser.name
    expect(screen.getByText('Test User')).toBeInTheDocument();
    
    // Check that "Log In" and "Sign Up" links are NOT present
    expect(screen.queryByText('Log In')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign Up')).not.toBeInTheDocument();
    
    // Check for the profile link by its data-testid
    expect(screen.getByTestId('user-profile')).toBeInTheDocument();
  });

  test('displays login link when not logged in', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('Log In')).toBeInTheDocument();
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
  });

  test('shows text logo when image fails to load', async () => {
    // Override the Image component to simulate an error
    const originalImage = global.Image;
    global.Image = class {
      onload() {}
      onerror() {
        setTimeout(() => this.onerror(), 0);
      }
    } as unknown as typeof global.Image;

    renderWithProviders(<Header />);
    
    // Wait for any fallback UI to appear
    await waitFor(() => {
      const logo = screen.getByAltText('JustSplit Logo');
      expect(logo).toBeInTheDocument();
    });

    // Restore the original Image constructor
    global.Image = originalImage;
  });
});
