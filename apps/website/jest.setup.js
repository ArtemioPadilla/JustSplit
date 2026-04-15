import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    route: '/',
    pathname: '',
    query: {},
    asPath: '',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
  }),
}));

// Global test environment setup
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock console.error and console.warn to fail tests on unexpected warnings/errors
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function (...args) {
  // Ignore specific errors in tests
  const ignoredErrors = [
    'Warning: ReactDOM.render is no longer supported',
    'Warning: React.createFactory() is deprecated',
  ];

  // Check if any of the ignored patterns are in the message
  if (args[0] && ignoredErrors.some(pattern => args[0].includes(pattern))) {
    return originalConsoleError.apply(console, args);
  }

  originalConsoleError.apply(console, args);
  throw new Error(`Unexpected console.error: ${args.join(' ')}`);
};

console.warn = function (...args) {
  // Ignore specific warnings in tests
  const ignoredWarnings = [
    'Warning: useLayoutEffect does nothing on the server',
  ];

  // Check if any of the ignored patterns are in the message
  if (args[0] && ignoredWarnings.some(pattern => args[0].includes(pattern))) {
    return originalConsoleWarn.apply(console, args);
  }

  originalConsoleWarn.apply(console, args);
  throw new Error(`Unexpected console.warn: ${args.join(' ')}`);
};

// Restore console methods after tests
afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});