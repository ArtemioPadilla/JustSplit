# Getting Started with CyberEco Platform

This guide will help you set up your development environment and start working with the CyberEco NX monorepo.

## Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Git**
- **Firebase CLI** (for deployment)
- **NX CLI** (recommended)

## Initial Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/cybereco.git
cd cybereco
```

### 2. Install NX CLI (Recommended)
```bash
npm install -g nx
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Environment Variables

#### Hub Application (.env.local)
Create `apps/hub/.env.local`:
```env
# Hub Firebase Configuration
NEXT_PUBLIC_HUB_API_KEY=your-hub-api-key
NEXT_PUBLIC_HUB_AUTH_DOMAIN=your-hub-auth-domain
NEXT_PUBLIC_HUB_PROJECT_ID=your-hub-project-id
NEXT_PUBLIC_HUB_STORAGE_BUCKET=your-hub-storage-bucket
NEXT_PUBLIC_HUB_MESSAGING_SENDER_ID=your-hub-sender-id
NEXT_PUBLIC_HUB_APP_ID=your-hub-app-id

# App URLs
NEXT_PUBLIC_JUSTSPLIT_URL=http://localhost:4000
```

#### JustSplit Application (.env.local)
Create `apps/justsplit/.env.local`:
```env
# Hub Configuration (for authentication)
NEXT_PUBLIC_HUB_API_KEY=your-hub-api-key
NEXT_PUBLIC_HUB_AUTH_DOMAIN=your-hub-auth-domain
NEXT_PUBLIC_HUB_PROJECT_ID=your-hub-project-id
NEXT_PUBLIC_HUB_STORAGE_BUCKET=your-hub-storage-bucket
NEXT_PUBLIC_HUB_MESSAGING_SENDER_ID=your-hub-sender-id
NEXT_PUBLIC_HUB_APP_ID=your-hub-app-id

# App-specific Configuration (optional)
NEXT_PUBLIC_JUSTSPLIT_PROJECT_ID=your-app-project-id
```

## Running the Applications

### Start All Applications
```bash
# Recommended: Start all apps in parallel
npm run dev

# Alternative: Start all via NX
nx run-many --target=serve --all
```

### Start Individual Applications
```bash
# Start the Hub (http://localhost:3000)
nx serve hub

# Start JustSplit (http://localhost:4000)
nx serve justsplit-app

# Start Website (http://localhost:5000)
nx serve website
```

### Start with Firebase Emulators
```bash
# In one terminal, start the emulators
nx run justsplit-app:emulators

# In another terminal, start the app
nx serve justsplit-app
```

## Development Workflow

### 1. Check the Dependency Graph
```bash
nx dep-graph
```

### 2. Make Changes
- Edit files in `apps/` or `libs/`
- NX will detect changes and rebuild affected projects

### 3. Run Tests
```bash
# Test specific project
nx test justsplit-app

# Test all projects
nx run-many --target=test --all

# Test only affected projects
nx affected:test
```

### 4. Lint Your Code
```bash
# Lint specific project
nx lint justsplit-app

# Lint all projects
nx run-many --target=lint --all
```

### 5. Build for Production
```bash
# Build specific app
nx build justsplit-app --configuration=production

# Build all apps
nx run-many --target=build --all --configuration=production
```

## Common Tasks

### Creating a New Component
```bash
# In a library
nx g @nrwl/react:component Button --project=ui-components

# In an app
nx g @nrwl/react:component Header --project=justsplit-app
```

### Creating a New Library
```bash
nx g @nrwl/js:library my-feature --directory=shared
```

### Running E2E Tests
```bash
nx e2e justsplit-app-e2e
```

### Formatting Code
```bash
nx format:write
```

## Troubleshooting

### Clear NX Cache
```bash
nx reset
```

### Reinstall Dependencies
```bash
rm -rf node_modules
npm install
```

### Check for Circular Dependencies
```bash
nx dep-graph
```

### Debug Build Issues
```bash
nx build justsplit-app --verbose
```

## Next Steps

1. Read the [NX Guide](./nx-guide.md) for advanced features
2. Review the [Architecture Overview](../architecture/overview.md)
3. Check the [Development Workflow](./development-workflow.md)
4. Learn about [Testing](./testing-guide.md)

## Useful Resources

- [NX Documentation](https://nx.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)