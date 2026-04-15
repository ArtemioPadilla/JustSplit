import { render, screen } from '@testing-library/react';
import ClientLayoutWrapper from './client-layout-wrapper';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '../context/AuthContext';

// Mock child components and Providers
jest.mock('../context/Providers', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">
      <AuthProvider value={{
        user: null,
        isLoading: false,
        error: null,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        signInWithProvider: jest.fn(),
        updateProfile: jest.fn(),
        userProfile: null,
        isAuthenticated: false,
        currentUser: null,
        hasDatabaseCorruption: false,
        handleDatabaseRecovery: jest.fn()
      }}>
        {children}
      </AuthProvider>
    </div>
  ),
}));

jest.mock('../components/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header">Header</header>,
}));

// Mock ProtectedRoute with a prop to control whether it renders children
let mockIsAuthenticated = true;
jest.mock('../components/Auth/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) =>
    mockIsAuthenticated ? <div data-testid="protected-route">{children}</div> : <div data-testid="protected-route-denied">Access Denied</div>,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  __esModule: true,
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

const mockUsePathname = usePathname as jest.Mock;

describe('ClientLayoutWrapper', () => {
  const TestChildren = () => <div data-testid="test-children">Test Children</div>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockIsAuthenticated = true; // Default to authenticated
  });

  it('renders children directly for auth routes without Header or ProtectedRoute', () => {
    mockUsePathname.mockReturnValue('/auth/signin');
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);

    expect(screen.getByTestId('providers')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument();
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('renders Header, ProtectedRoute, and main content for non-auth routes when authenticated', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockIsAuthenticated = true;
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);

    expect(screen.getByTestId('providers')).toBeInTheDocument();
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByTestId('test-children')).toBeInTheDocument(); // Children are inside main
  });

  it('renders ProtectedRoute but not Header or main content for non-auth routes when not authenticated', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    mockIsAuthenticated = false; // Simulate ProtectedRoute denying access
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);

    expect(screen.getByTestId('providers')).toBeInTheDocument();
    // ProtectedRoute itself is rendered, but its content (Header, main) is not
    expect(screen.getByTestId('protected-route-denied')).toBeInTheDocument(); 
    expect(screen.queryByTestId('header')).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
    expect(screen.queryByTestId('test-children')).not.toBeInTheDocument();
  });

  it('correctly identifies various auth routes', () => {
    mockUsePathname.mockReturnValue('/auth/signup');
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();

    mockUsePathname.mockReturnValue('/auth/reset-password');
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);
    expect(screen.queryByTestId('protected-route')).not.toBeInTheDocument();
  });

  it('correctly identifies root path as non-auth route', () => {
    mockUsePathname.mockReturnValue('/');
    mockIsAuthenticated = true;
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('correctly identifies profile settings path as non-auth route', () => {
    mockUsePathname.mockReturnValue('/profile/settings');
    mockIsAuthenticated = true;
    render(<ClientLayoutWrapper><TestChildren /></ClientLayoutWrapper>);
    expect(screen.getByTestId('protected-route')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });
});