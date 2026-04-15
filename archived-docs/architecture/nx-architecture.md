# NX Monorepo Architecture

## Overview

JustSplit uses NX as its monorepo tool, providing powerful features for managing multiple applications and libraries in a single repository.

## Workspace Structure

```
justsplit-monorepo/
├── apps/                       # Applications
│   ├── hub/                   # Central authentication hub
│   │   ├── src/              # Application source
│   │   ├── public/           # Static assets
│   │   ├── project.json      # NX project configuration
│   │   ├── next.config.js    # Next.js configuration
│   │   └── tsconfig.json     # TypeScript configuration
│   │
│   └── justsplit/            # Expense management app
│       ├── src/              # Application source
│       ├── public/           # Static assets
│       ├── project.json      # NX project configuration
│       ├── next.config.js    # Next.js configuration
│       └── tsconfig.json     # TypeScript configuration
│
├── libs/                      # Shared libraries
│   ├── shared-types/         # TypeScript type definitions
│   ├── firebase-config/      # Firebase configuration utilities
│   └── ui-components/        # Reusable React components
│
├── tools/                     # Custom NX tools and scripts
├── nx.json                   # NX workspace configuration
├── workspace.json            # Workspace project references
└── tsconfig.base.json        # Base TypeScript configuration
```

## Key NX Features

### 1. Dependency Graph
View and analyze project dependencies:
```bash
nx dep-graph
```

### 2. Affected Commands
Run commands only on affected projects:
```bash
nx affected:build --base=main
nx affected:test --base=main
nx affected:lint --base=main
```

### 3. Build Caching
- Local computation caching
- Remote caching with NX Cloud (optional)
- Incremental builds

### 4. Task Orchestration
Parallel execution with proper ordering:
```bash
nx run-many --target=build --all --parallel=3
```

## Project Configuration

### Application Configuration (project.json)
```json
{
  "name": "justsplit-app",
  "targets": {
    "build": {
      "executor": "@nrwl/next:build",
      "options": {
        "outputPath": "dist/apps/justsplit"
      }
    },
    "serve": {
      "executor": "@nrwl/next:server",
      "options": {
        "buildTarget": "justsplit-app:build",
        "port": 4000
      }
    },
    "test": {
      "executor": "@nrwl/jest:jest",
      "options": {
        "jestConfig": "apps/justsplit/jest.config.js"
      }
    }
  }
}
```

### Library Configuration
```json
{
  "name": "shared-types",
  "targets": {
    "build": {
      "executor": "@nrwl/js:tsc",
      "options": {
        "outputPath": "dist/libs/shared-types"
      }
    }
  }
}
```

## Build Pipeline

### Development Workflow
1. **Local Development**
   ```bash
   nx serve justsplit-app
   nx serve hub
   ```

2. **Running Tests**
   ```bash
   nx test justsplit-app
   nx run-many --target=test --all
   ```

3. **Building for Production**
   ```bash
   nx build justsplit-app --configuration=production
   nx build hub --configuration=production
   ```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Build affected apps
  run: nx affected:build --base=${{ github.event.before }}

- name: Test affected apps
  run: nx affected:test --base=${{ github.event.before }}
```

## Shared Libraries

### Creating a New Library
```bash
nx g @nrwl/js:library my-lib --directory=shared
```

### Library Types
1. **Feature Libraries**: Business logic and UI
2. **UI Libraries**: Reusable components
3. **Data Libraries**: State management and API
4. **Utility Libraries**: Helper functions

## Import Paths

Configured in `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@cybereco/shared-types": ["libs/shared-types/src/index.ts"],
      "@cybereco/firebase-config": ["libs/firebase-config/src/index.ts"],
      "@cybereco/ui-components": ["libs/ui-components/src/index.ts"]
    }
  }
}
```

Usage in applications:
```typescript
import { User } from '@cybereco/shared-types';
import { Button } from '@cybereco/ui-components';
```

## Best Practices

### 1. Project Boundaries
- Apps should not import from other apps
- Libraries should not import from apps
- Enforce boundaries with ESLint rules

### 2. Library Organization
- Keep libraries focused and single-purpose
- Use barrel exports (index.ts)
- Document public APIs

### 3. Dependency Management
- Shared dependencies in root package.json
- App-specific dependencies in app package.json
- Regular dependency updates

### 4. Testing Strategy
- Unit tests for libraries
- Integration tests for apps
- E2E tests for critical user flows

## NX Commands Reference

### Common Commands
```bash
# Serve applications
nx serve <app-name>

# Build applications
nx build <app-name>

# Run tests
nx test <project-name>

# Lint code
nx lint <project-name>

# Format code
nx format:write

# Generate code
nx g @nrwl/react:component Button --project=ui-components

# Run multiple targets
nx run-many --target=build --all

# Show affected projects
nx affected:apps
nx affected:libs

# Clean cache
nx reset
```

### Advanced Features
- Custom executors for specialized tasks
- Custom generators for code scaffolding
- Workspace generators for consistency
- Task pipelines for complex workflows