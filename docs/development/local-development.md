# Local Development Guide

This guide provides instructions for setting up and running the CyberEco Platform applications in your local development environment.

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 18.x or later)
- [npm](https://www.npmjs.com/) (version 8.x or later) or [yarn](https://yarnpkg.com/) (version 1.22.x or later)
- [Git](https://git-scm.com/)
- [Firebase CLI](https://firebase.google.com/docs/cli) (for emulator usage)

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

## Running the Applications

### Development Mode

To run all applications in development mode with hot-reloading:

```bash
npm run dev
```

Or using yarn:
```bash
yarn dev
```

This will start the following applications:
- Website: [http://localhost:5000](http://localhost:5000)
- Hub: [http://localhost:3000](http://localhost:3000)
- JustSplit: [http://localhost:4000](http://localhost:4000)

### Running Individual Applications

To run a specific application:

```bash
# Run only the website
npm run dev:website

# Run only the hub
nx serve hub

# Run only JustSplit
nx serve justsplit-app
```

### Production Build

To create a production build for all applications:

```bash
npm run build
```

Or using yarn:
```bash
yarn build
```

To build a specific application:

```bash
# Build Website
npm run build:website
# or from within the website directory
cd apps/website && npm run build

# Build Hub
nx build hub --configuration=production

# Build JustSplit
nx build justsplit-app --configuration=production
```

### Firebase Emulator Usage

To run Firebase emulators:

```bash
# Start all Firebase emulators
npm run emulators

# Start hosting emulators for testing
npm run hosting:website    # localhost:5000
npm run hosting:justsplit  # localhost:4000
npm run hosting:hub        # localhost:3000
```

To run development with Firebase hosting emulation:

```bash
# Run Website with Firebase hosting
npm run hosting:dev:website

# Run Hub with Firebase hosting
npm run hosting:dev:hub

# Run JustSplit with Firebase hosting
npm run hosting:dev:justsplit
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

### Running Specific App Tests

```bash
# Test Website
nx test website

# Test Hub
nx test hub

# Test JustSplit
nx test justsplit-app
```

### Testing in Watch Mode

For development, it's often useful to run tests in watch mode, which automatically reruns tests when files change:

```bash
nx test justsplit-app --watch
```

Or using yarn:
```bash
yarn test --watch
```

### Running Specific Tests

To run tests for a specific file or module:

```bash
nx test justsplit-app --testPathPattern=expenseCalculator
```

For example, to run only the expense calculator tests:

```bash
nx test justsplit-app --testPathPattern=src/utils/__tests__/expenseCalculator.test.ts
```

### Test Coverage

To generate a test coverage report:

```bash
nx test justsplit-app --coverage
```

The coverage report will be generated in the `coverage` directory and can be viewed by opening `coverage/apps/justsplit/lcov-report/index.html` in your browser.

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

## NX Commands

NX provides powerful monorepo tooling:

```bash
# View dependency graph
nx dep-graph

# Run affected projects only
nx affected:test
nx affected:build

# Generate new components
nx g @nx/react:component Button --project=ui-components

# Create a new application (will not work without special adjustments)
# nx g @nx/next:app new-app
```

## Environment Variables

Create a `.env.local` file in the root directory to add your environment variables. Example:

```env
# Firebase settings
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Deployment

To deploy to Firebase hosting:

```bash
# Deploy all applications
./scripts/deploy-all.sh

# Deploy individual applications
./scripts/deploy-website.sh
./scripts/deploy-hub.sh
./scripts/deploy-justsplit.sh
```