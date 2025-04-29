// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Set timezone to avoid date-related test failures
process.env.TZ = 'UTC';
