# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this NX monorepo.

## NX Monorepo Structure

This is an NX monorepo with the following structure:
- `apps/hub` - Central authentication hub application (Next.js 15)
- `apps/justsplit` - Expense splitting application (Next.js 15)
- `libs/shared-types` - Shared TypeScript types
- `libs/firebase-config` - Firebase configuration utilities
- `libs/ui-components` - Shared UI components
- `firebase/` - Firebase deployment configurations
- `nx.json` - NX workspace configuration
- `workspace.json` - Project definitions

## Development Commands

### NX Commands
- `npm install` - Install all dependencies
- `nx serve <app>` - Start specific app in development
- `nx build <app>` - Build specific app
- `nx test <project>` - Run tests for specific project
- `nx lint <project>` - Lint specific project
- `nx dep-graph` - View dependency graph
- `nx affected:test` - Test only affected projects
- `nx affected:build` - Build only affected projects
- `nx run-many --target=<target> --all` - Run target on all projects

### Common Development Tasks
- `npm run dev` - Start all applications
- `npm run dev:hub` - Start hub only (port 3000)
- `npm run dev:justsplit` - Start JustSplit only (port 4000)
- `npm run build` - Build all applications
- `npm run test` - Run all tests
- `npm run lint` - Run ESLint across all projects

### Firebase Commands
- `nx run justsplit-app:emulators` - Start Firebase emulators
- `nx run hub:deploy` - Deploy hub to Firebase
- `nx run justsplit-app:deploy` - Deploy JustSplit to Firebase
- `./scripts/deploy-all.sh` - Deploy all applications

## Architecture Overview

### Monorepo Architecture
- **Monorepo Tool**: NX for superior build caching and dependency management
- **Build System**: NX with computation caching and affected commands
- **Shared Libraries**: Types, UI components, and Firebase configuration in `libs/`
- **Multi-Project Firebase**: Hub for auth, individual projects for app data
- **Deployment**: Optimized for low-cost Firebase hosting or on-premises

### Framework Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, React 18
- **Backend**: Firebase (Firestore, Auth) with multi-project support
- **Styling**: CSS Modules with shared UI components
- **Testing**: Jest with React Testing Library, 70% coverage threshold

### Key Architecture Patterns

**Multi-Project Firebase Setup**:
- Hub project handles all authentication
- App projects handle app-specific data
- Shared configuration in `packages/firebase-config`
- Token verification across projects

**Shared Packages**:
- `@justsplit/shared-types` - Common TypeScript interfaces
- `@justsplit/firebase-config` - Firebase utilities and configuration
- `@justsplit/ui-components` - Reusable React components

**Context-Based State Management**:
Each app uses React Context for global state:
- `AuthProvider` - User authentication state (from hub)
- `AppProvider` - Application-wide state
- `NotificationProvider` - Toast notifications and alerts

**Component Structure**:
- App Router pages in `apps/*/src/app/`
- Reusable components in `libs/ui-components/`
- App-specific components in `apps/*/src/components/`

**Data Models**:
Core entities defined in `libs/shared-types/src/`:
- Hub entities: `AuthUser`, `HubUser`, `App`, `AppPermission`
- JustSplit entities: `User`, `Group`, `Event`, `Expense`, `Settlement`

**NX Project Configuration**:
- Each app/lib has a `project.json` defining targets
- Targets include: build, serve, test, lint, deploy
- Custom executors for specialized tasks

### Testing Strategy

Tests are co-located with components in `__tests__` directories. Each app maintains 70% coverage. Test files use the pattern `*.test.tsx` for components and `*.test.ts` for utilities.

### Firebase Emulator Setup

Development uses Firebase emulators running on:
- Firestore: localhost:8080
- Auth: localhost:9099
- UI: localhost:5002

The emulator data persists in `./emulator-data/` and is automatically imported/exported on start/stop.

### Module Aliases

Each app has its own tsconfig with aliases:
- `@/components/*` → `./src/components/*`
- `@/context/*` → `./src/context/*`
- `@/utils/*` → `./src/utils/*`
- `@justsplit/shared-types` → `libs/shared-types`
- `@justsplit/firebase-config` → `libs/firebase-config`
- `@justsplit/ui-components` → `libs/ui-components`

## Working with NX

### Creating New Components
```bash
# In a library
nx g @nrwl/react:component Button --project=ui-components

# In an app
nx g @nrwl/react:component Header --project=justsplit-app
```

### Creating New Libraries
```bash
nx g @nrwl/js:library feature-name --directory=shared
```

### Checking Affected Projects
```bash
nx affected:apps --base=main
nx affected:libs --base=main
```

### Build Order
NX automatically determines build order based on dependencies. Use `nx dep-graph` to visualize.