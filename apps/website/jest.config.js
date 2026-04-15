const { getJestConfig } = require('@nx/next/plugins/jest');

/** @type {import('jest').Config} */
const jestConfig = {
  ...getJestConfig(__dirname),
  displayName: 'website',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['@nx/next/babel'] }],
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  testEnvironment: 'jsdom',
};

module.exports = jestConfig;