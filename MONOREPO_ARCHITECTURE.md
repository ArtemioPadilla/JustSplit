# Monorepo Architecture Design

## Overview
This document outlines the monorepo structure for hosting multiple low-cost applications with a central hub for authentication and shared resources.

## Project Structure

```
justsplit-monorepo/
├── apps/
│   ├── hub/                    # Central authentication and navigation hub
│   │   ├── src/
│   │   │   ├── app/           # Next.js app directory
│   │   │   ├── components/    # Hub-specific components
│   │   │   ├── lib/          # Shared utilities
│   │   │   └── services/     # Authentication services
│   │   ├── public/
│   │   ├── next.config.js
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── justsplit/             # Expense management application
│       ├── src/               # Current src directory (migrated)
│       ├── public/
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/          # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── firebase-config/       # Shared Firebase configuration
│   │   ├── src/
│   │   │   ├── config.ts
│   │   │   ├── auth.ts
│   │   │   └── firestore.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui-components/         # Shared UI components
│       ├── src/
│       │   ├── Button/
│       │   ├── Card/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── firebase/
│   ├── hub/                   # Hub project Firebase config
│   │   ├── firebase.json
│   │   ├── firestore.rules
│   │   └── firestore.indexes.json
│   │
│   └── justsplit/            # JustSplit Firebase config
│       ├── firebase.json
│       ├── firestore.rules
│       └── firestore.indexes.json
│
├── scripts/
│   ├── deploy-hub.sh
│   ├── deploy-justsplit.sh
│   └── deploy-all.sh
│
├── .github/
│   └── workflows/
│       ├── hub-deploy.yml
│       └── justsplit-deploy.yml
│
├── package.json              # Root package.json with workspaces
├── pnpm-workspace.yaml      # PNPM workspace configuration
├── turbo.json               # Turborepo configuration
├── tsconfig.base.json       # Base TypeScript config
└── README.md
```

## Key Design Decisions

### 1. Package Manager: PNPM
- Efficient disk space usage through hard links
- Strict dependency resolution
- Built-in workspace support
- Perfect for monorepos with shared dependencies

### 2. Build System: Turborepo
- Incremental builds
- Remote caching capabilities
- Parallel execution
- Dependency graph awareness

### 3. Shared Packages
- **shared-types**: Common TypeScript interfaces and types
- **firebase-config**: Centralized Firebase configuration and utilities
- **ui-components**: Reusable UI components across apps

### 4. Firebase Architecture

#### Hub Project (Central)
- **Purpose**: Authentication hub and shared resources
- **Resources**:
  - Firebase Authentication (all users)
  - Firestore collections:
    - `/users/{uid}` - User profiles
    - `/apps/{appId}` - Available applications
    - `/permissions/{uid}` - User app permissions
  - Cloud Functions for cross-app operations

#### App Projects (e.g., JustSplit)
- **Purpose**: Isolated app-specific resources
- **Resources**:
  - Firestore for app-specific data
  - Storage for app-specific files
  - App-specific Cloud Functions
- **Authentication**: Verify tokens from hub project

### 5. Authentication Flow

1. User logs in via Hub app
2. Hub issues Firebase Auth token
3. User navigates to app (e.g., JustSplit)
4. App verifies token with Hub project
5. App creates/updates local user record linked to hub UID
6. App loads user-specific data

### 6. Data Sharing Strategy

#### Shared Data (Hub Firestore)
- User profiles
- App permissions
- Global settings

#### App-Specific Data (App Firestore)
- All current JustSplit collections
- Linked to hub user via UID

#### Cross-App Communication
- Service accounts for secure access
- Cloud Functions in hub for orchestration
- Pub/Sub for real-time updates (if needed)

## Migration Steps

### Phase 1: Repository Setup
1. Initialize pnpm workspaces
2. Configure Turborepo
3. Set up shared packages structure

### Phase 2: Hub Development
1. Create minimal hub app
2. Implement authentication UI
3. Add app directory/launcher

### Phase 3: JustSplit Migration
1. Move current code to `apps/justsplit`
2. Extract shared components
3. Update imports and dependencies

### Phase 4: Firebase Setup
1. Create hub Firebase project
2. Configure authentication
3. Set up security rules
4. Update JustSplit to use hub auth

### Phase 5: Deployment
1. Configure CI/CD for each app
2. Set up deployment scripts
3. Test end-to-end flow

## Benefits

1. **Code Reuse**: Shared packages reduce duplication
2. **Type Safety**: Shared types ensure consistency
3. **Independent Deployment**: Apps can be deployed separately
4. **Scalability**: Easy to add new apps
5. **Cost Efficiency**: Multiple apps share authentication infrastructure
6. **Maintainability**: Centralized configuration and tooling