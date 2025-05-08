// Import Jest DOM utilities
import '@testing-library/jest-dom';

// Mock the Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/',
    route: '/',
    asPath: '/',
    query: {},
    back: jest.fn(),
  })),
}));

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(key => {
      if (key === 'event') return 'event1';
      if (key === 'friend') return 'user1';
      return null;
    }),
  })),
  useParams: jest.fn(() => ({ id: 'test-id' })),
}));

// Mock window.localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      chart: {
        result: [{
          meta: {
            regularMarketPrice: 1.08,
            chartPreviousClose: 1.07,
          }
        }]
      }
    })
  })
);

// FIX: Direct mock for URL methods instead of using spyOn
// Jest's environment doesn't have these methods defined
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors and warnings in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (
    /Warning:.*not wrapped in act/.test(args[0]) ||
    /Warning:.*Cannot update a component/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (/Warning:.*not wrapped in act/.test(args[0])) {
    return;
  }
  originalConsoleWarn(...args);
};

// Silence console logs during tests
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleDebug = console.debug;

// Only log errors and warnings during tests
if (process.env.NODE_ENV === 'test') {
  console.log = (...args) => {
    // You can enable specific logs if needed for debugging
    // Uncomment the line below when debugging tests
    // originalConsoleLog(...args);
  };
  
  console.info = (...args) => {
    // originalConsoleInfo(...args);
  };
  
  console.debug = (...args) => {
    // originalConsoleDebug(...args);
  };
  
  // Keep console.error and console.warn enabled
  // as they are important for test failures
}

// Rest of your Jest setup code...
