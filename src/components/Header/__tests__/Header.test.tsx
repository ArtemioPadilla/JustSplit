import React from 'react';
import { render, screen } from '@testing-library/react';
import Header from '../index';
import { renderWithAppContext } from '../../../test-utils';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock next/image
jest.mock('next/image', () => {
  return ({ src, alt, width, height }: any) => {
    return <img src={src} alt={alt} width={width} height={height} data-testid="logo-image" />;
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
  });
  
  test('displays user name when logged in', () => {
    const initialState = {
      users: [{ id: 'user1', name: 'Test User', email: 'test@example.com' }],
      expenses: [],
      events: [],
      settlements: []
    };
    
    renderWithAppContext(<Header />, { initialState });
    
    // Look for user profile component/element instead of exact text
    // This is more flexible as the username could be inside a span or other element
    const userElement = screen.getByTestId('user-profile');
    expect(userElement).toBeInTheDocument();
    expect(userElement.textContent).toContain('Test User');
  });
});
