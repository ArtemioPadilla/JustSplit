# JustSplit Platform - NX Monorepo Architecture

## Overview

The JustSplit platform has been architected as an NX monorepo to support multiple applications while sharing common libraries and maintaining consistent development practices. This document outlines the complete architecture, including applications, libraries, and their relationships.

## Repository Structure

```
JustSplit/
├── apps/                          # Applications
│   ├── hub/                       # Hub application
│   │   ├── src/
│   │   │   ├── app/              # Next.js app router
│   │   │   ├── components/       # Hub-specific components
│   │   │   ├── lib/              # Hub utilities
│   │   │   └── services/         # Hub services
│   │   ├── project.json          # NX project configuration
│   │   ├── next.config.js        # Next.js configuration
│   │   └── package.json          # App-specific dependencies
│   │
│   └── justsplit/                 # JustSplit application
│       ├── src/
│       │   ├── app/              # Next.js app router
│       │   ├── components/       # JustSplit-specific components
│       │   ├── context/          # React contexts
│       │   ├── types/            # App-specific types
│       │   └── utils/            # JustSplit utilities
│       ├── project.json          # NX project configuration
│       ├── next.config.js        # Next.js configuration
│       └── package.json          # App-specific dependencies
│
├── libs/                          # Shared libraries
│   ├── shared-types/              # Platform-wide type definitions
│   │   ├── src/
│   │   │   ├── auth.ts           # Authentication types
│   │   │   ├── user.ts           # User types
│   │   │   ├── app.ts            # App types
│   │   │   └── index.ts          # Exports
│   │   └── project.json          # Library configuration
│   │
│   ├── firebase-config/           # Shared Firebase configuration
│   │   ├── src/
│   │   │   ├── config.ts         # Firebase setup
│   │   │   └── index.ts          # Exports
│   │   └── project.json          # Library configuration
│   │
│   └── ui-components/             # Shared UI component library
│       ├── src/
│       │   ├── components/       # Reusable components
│       │   ├── styles/           # Shared styles
│       │   └── index.ts          # Exports
│       └── project.json          # Library configuration
│
├── firebase/                      # Firebase configuration per app
│   ├── hub/                      # Hub Firebase config
│   │   ├── firebase.json
│   │   └── firestore.rules
│   └── justsplit/                # JustSplit Firebase config
│       ├── firebase.json
│       └── firestore.rules
│
├── docs/                          # Documentation
├── nx.json                        # NX workspace configuration
├── workspace.json                 # NX workspace projects
├── tsconfig.base.json            # Base TypeScript configuration
└── package.json                  # Root dependencies
```

## Applications

### Hub App (`apps/hub`)

**Purpose**: Central authentication and application management system

**Technology Stack**:
- Next.js 14 with App Router
- TypeScript
- Firebase Auth
- Tailwind CSS (or styled-components)

**Key Responsibilities**:
- User authentication and authorization
- Application registry and management
- User preferences and settings
- Cross-app navigation
- Role-based access control

**Key Features**:
- Single sign-on for all platform apps
- Application discovery and access
- User profile management
- Permission management
- Platform-wide notifications

**Dependencies**:
- `@cybereco/shared-types`
- `@cybereco/firebase-config`
- `@cybereco/ui-components`

### JustSplit App (`apps/justsplit`)

**Purpose**: Core expense splitting and financial management application

**Technology Stack**:
- Next.js 14 with App Router
- TypeScript
- Firebase Firestore
- Material-UI (MUI)
- Chart.js for visualizations

**Key Responsibilities**:
- Expense creation and management
- Group and event organization
- Financial calculations and splitting
- Settlement tracking
- Real-time collaboration

**Key Features**:
- Multi-currency expense tracking
- Various splitting methods (equal, percentage, custom)
- Group and event management
- Settlement calculations
- Expense categorization and analytics
- Timeline and dashboard views

**Dependencies**:
- `@cybereco/shared-types`
- `@cybereco/firebase-config`
- `@cybereco/ui-components`

## Shared Libraries

### `libs/shared-types`

**Purpose**: Platform-wide TypeScript type definitions

**Contents**:
- Authentication types (`AuthUser`, `AuthToken`)
- Platform user types (`HubUser`)
- Application types (`App`, `AppPermission`)
- Common utility types

**Usage**:
```typescript
import { AuthUser, HubUser, App } from '@cybereco/shared-types';
```

**Benefits**:
- Type consistency across applications
- Single source of truth for shared types
- Compile-time validation of data contracts

### `libs/firebase-config`

**Purpose**: Shared Firebase configuration and utilities

**Contents**:
- Firebase app initialization
- Authentication setup
- Firestore configuration
- Common Firebase utilities

**Usage**:
```typescript
import { auth, db, app } from '@cybereco/firebase-config';
```

**Benefits**:
- Consistent Firebase setup across apps
- Shared authentication state
- Common database connection

### `libs/ui-components`

**Purpose**: Shared UI component library following the design system

**Contents**:
- Base components (Button, Input, Card, etc.)
- Composite components (Forms, Modals, etc.)
- Design tokens and theme utilities
- Common styles and CSS utilities

**Usage**:
```typescript
import { Button, Card, Modal } from '@cybereco/ui-components';
```

**Benefits**:
- Consistent UI across applications
- Shared design system implementation
- Reduced code duplication
- Centralized component maintenance

## NX Configuration

### Workspace Configuration (`nx.json`)

```json
{
  "version": 3,
  "projects": {
    "hub": "apps/hub",
    "justsplit": "apps/justsplit",
    "shared-types": "libs/shared-types",
    "firebase-config": "libs/firebase-config",
    "ui-components": "libs/ui-components"
  },
  "defaultProject": "hub",
  "plugins": [
    "@nx/next",
    "@nx/typescript",
    "@nx/eslint"
  ]
}
```

### Project Configuration Example (`apps/hub/project.json`)

```json
{
  "name": "hub",
  "projectType": "application",
  "sourceRoot": "apps/hub/src",
  "targets": {
    "build": {
      "executor": "@nx/next:build",
      "options": {
        "outputPath": "dist/apps/hub"
      }
    },
    "serve": {
      "executor": "@nx/next:dev",
      "options": {
        "port": 3000
      }
    },
    "lint": {
      "executor": "@nx/eslint:lint",
      "options": {
        "lintFilePatterns": ["apps/hub/**/*.{ts,tsx}"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "options": {
        "jestConfig": "apps/hub/jest.config.js"
      }
    }
  },
  "tags": ["scope:hub", "type:app"]
}
```

## Development Workflow

### Local Development

1. **Start all applications**:
   ```bash
   # Start Hub app
   npx nx serve hub
   
   # Start JustSplit app
   npx nx serve justsplit
   ```

2. **Build specific app**:
   ```bash
   npx nx build hub
   npx nx build justsplit
   ```

3. **Run tests**:
   ```bash
   # Run all tests
   npx nx run-many --target=test --all
   
   # Run tests for specific app
   npx nx test hub
   npx nx test justsplit
   ```

4. **Lint code**:
   ```bash
   npx nx run-many --target=lint --all
   ```

### Dependency Management

**Shared Library Updates**:
- Changes to shared libraries automatically affect all consuming apps
- NX tracks dependencies and rebuilds affected projects
- Use `nx affected` commands to run tasks only on changed projects

**Adding Dependencies**:
```bash
# Add dependency to specific app
npm install --save package-name --workspace=apps/hub

# Add dependency to shared library
npm install --save package-name --workspace=libs/shared-types
```

## Build and Deployment

### Build Process

1. **Dependency Analysis**: NX analyzes project dependencies
2. **Incremental Builds**: Only builds affected projects
3. **Library Building**: Shared libraries built first
4. **Application Building**: Apps built with library dependencies

### Deployment Strategy

**Per-App Deployment**:
- Each app can be deployed independently
- Separate Firebase projects for isolation
- Independent CI/CD pipelines

**Deployment Commands**:
```bash
# Deploy Hub app
npm run deploy:hub

# Deploy JustSplit app
npm run deploy:justsplit

# Deploy all apps
npm run deploy:all
```

### GitHub Actions Workflows

**Hub App Deployment** (`.github/workflows/deploy-hub.yml`):
- Triggers on changes to `apps/hub/**`, `libs/**`, or `firebase/hub/**`
- Builds Hub app with environment variables
- Deploys to Firebase Hosting
- Runs tests and linting

**JustSplit App Deployment** (`.github/workflows/deploy-justsplit.yml`):
- Triggers on changes to `apps/justsplit/**`, `libs/**`, or `firebase/justsplit/**`
- Builds JustSplit app with environment variables
- Deploys to Firebase Hosting
- Runs tests and linting

## Environment Configuration

### Environment Variables

**Hub App** (`.env.local`):
```env
NEXT_PUBLIC_HUB_API_KEY=...
NEXT_PUBLIC_HUB_AUTH_DOMAIN=...
NEXT_PUBLIC_HUB_PROJECT_ID=...
NEXT_PUBLIC_HUB_STORAGE_BUCKET=...
NEXT_PUBLIC_HUB_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_HUB_APP_ID=...
```

**JustSplit App** (`.env.local`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Security Considerations

### Firebase Security Rules

**Separate Rules Per App**:
- Hub app: User and app management rules
- JustSplit app: Expense and group management rules

**Cross-App Authentication**:
- Shared Firebase Auth configuration
- User token validation across apps
- Role-based access control

### Data Isolation

**Per-App Collections**:
- Hub collections: `users`, `apps`, `permissions`
- JustSplit collections: `expenses`, `groups`, `events`, `settlements`

**Access Control**:
- Users can only access their own data
- Role-based feature access
- Cross-app permission validation

## Performance Optimizations

### Code Splitting

**Library Chunking**:
- Shared libraries bundled separately
- Dynamic imports for large components
- Route-based code splitting per app

**Build Optimization**:
- NX caching for faster builds
- Incremental static regeneration (ISR) for Next.js
- CDN deployment for static assets

### Data Fetching

**Firestore Optimization**:
- Collection-based data isolation
- Efficient query patterns
- Real-time listeners for collaborative features

## Testing Strategy

### Unit Testing

**Jest Configuration**:
- Shared Jest setup across apps
- Component testing with React Testing Library
- Type-safe mocking utilities

**Test Organization**:
```
apps/hub/__tests__/
apps/justsplit/__tests__/
libs/shared-types/__tests__/
libs/ui-components/__tests__/
```

### Integration Testing

**Cross-App Testing**:
- Authentication flow testing
- Shared component integration
- Firebase service testing

### E2E Testing

**Cypress Setup**:
- End-to-end user journeys
- Cross-app navigation testing
- Real Firebase integration testing

## Migration Benefits

### From Single App to NX Monorepo

**Benefits Achieved**:
1. **Code Reusability**: Shared components and utilities
2. **Type Safety**: Consistent types across apps
3. **Development Efficiency**: Single repository for related apps
4. **Deployment Flexibility**: Independent app deployments
5. **Maintenance**: Centralized dependency management
6. **Scalability**: Easy to add new apps and libraries

**Challenges Addressed**:
1. **Code Duplication**: Eliminated through shared libraries
2. **Inconsistent Design**: Unified through shared UI components
3. **Type Mismatches**: Resolved through shared type definitions
4. **Build Complexity**: Simplified through NX tooling

## Future Considerations

### Additional Applications

**Potential New Apps**:
- Admin dashboard for platform management
- Mobile app using React Native
- API server using NestJS
- Analytics dashboard

### Enhanced Libraries

**Planned Additions**:
- `libs/api-client` - Shared API utilities
- `libs/common-utils` - Utility functions
- `libs/testing-utils` - Test helpers
- `libs/analytics` - Analytics utilities

### Platform Evolution

**Technical Roadmap**:
- Micro-frontend architecture consideration
- GraphQL API layer implementation
- Advanced caching strategies
- Real-time collaboration enhancements

This NX monorepo architecture provides a solid foundation for the JustSplit platform's growth while maintaining code quality, consistency, and developer productivity.
