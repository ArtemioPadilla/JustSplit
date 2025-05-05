# Local Development Guide

This guide provides instructions for setting up and running the JustSplit application in your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 18.x or later)
- [npm](https://www.npmjs.com/) (version 8.x or later) or [yarn](https://yarnpkg.com/) (version 1.22.x or later)
- [Git](https://git-scm.com/)

## Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/ArtemioPadilla/JustSplit.git
   cd JustSplit
   ```

2. **Install Dependencies**

   Using npm:
   ```bash
   npm install
   ```

   Or using yarn:
   ```bash
   yarn install
   ```

## Running the Application

### Development Mode

To run the application in development mode with hot-reloading:

```bash
npm run dev
```

Or using yarn:
```bash
yarn dev
```

The application will be available at [http://localhost:4000](http://localhost:4000).

### Production Build

To create a production build:

```bash
npm run build
```

Or using yarn:
```bash
yarn build
```

To start the production server:

```bash
npm run start
```

Or using yarn:
```bash
yarn start
```

## Testing

JustSplit uses Jest and React Testing Library for unit and integration testing. The test files are located next to the components and utilities they test, typically in a `__tests__` directory.

### Running Tests

To run the full test suite once:

```bash
npm run test
```

Or using yarn:
```bash
yarn test
```

### Testing in Watch Mode

For development, it's often useful to run tests in watch mode, which automatically reruns tests when files change:

```bash
npm run test -- --watch
```

Or using yarn:
```bash
yarn test --watch
```

### Running Specific Tests

To run tests for a specific file or module:

```bash
npm run test -- path/to/test-file.test.ts
```

For example, to run only the expense calculator tests:

```bash
npm run test -- src/lib/__tests__/expenseCalculator.test.ts
```

### Test Coverage

To generate a test coverage report:

```bash
npm run test -- --coverage
```

The coverage report will be generated in the `coverage` directory and can be viewed by opening `coverage/lcov-report/index.html` in your browser.

### Testing Strategies

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test how components interact with each other
- **Component Tests**: Test React components with various props and states

When writing tests:
1. Focus on testing behavior, not implementation details
2. Use descriptive test names that explain what's being tested
3. Follow the Arrange-Act-Assert pattern
4. Mock external dependencies when necessary

## Linting

To lint your code:

```bash
npm run lint
```

Or using yarn:
```bash
yarn lint
```

## Environment Variables

Create a `.env.local` file in the root directory to add your environment variables. Example:

