#!/bin/bash

# Migration script for JustSplit app to monorepo structure

echo "Starting JustSplit migration to monorepo..."

# Create app directory
mkdir -p apps/justsplit

# Move source files
echo "Moving source files..."
cp -r src apps/justsplit/
cp -r public apps/justsplit/
cp next.config.js apps/justsplit/
cp tsconfig.json apps/justsplit/
cp jest.config.js apps/justsplit/
cp jest.setup.js apps/justsplit/

# Create new package.json for JustSplit app
echo "Creating JustSplit package.json..."
cat > apps/justsplit/package.json << 'EOF'
{
  "name": "@cybereco/app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 4000 --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "type-check": "tsc --noEmit",
    "deploy": "npm run build && firebase deploy --only hosting:justsplit"
  },
  "dependencies": {
    "@cybereco/shared-types": "workspace:*",
    "@cybereco/firebase-config": "workspace:*",
    "@cybereco/ui-components": "workspace:*",
    "@emotion/react": "^11.14.0",
    "@emotion/styled": "^11.14.0",
    "@mui/icons-material": "^7.1.0",
    "@mui/material": "^7.1.0",
    "@mui/x-date-pickers": "^8.3.0",
    "@types/uuid": "^9.0.8",
    "chart.js": "^4.4.9",
    "date-fns": "^4.1.0",
    "firebase": "^11.7.3",
    "framer-motion": "^10.16.4",
    "motion": "^12.12.1",
    "next": "^15.3.2",
    "react": "^18.3.1",
    "react-chartjs-2": "^5.3.0",
    "react-dom": "^18.3.1",
    "react-intersection-observer": "^9.5.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.3.0",
    "@testing-library/react": "^14.2.1",
    "@types/jest": "^29.5.14",
    "@types/node": "^20",
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "eslint": "^8",
    "eslint-config-next": "^15.3.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "jest-html-reporter": "^4.1.0",
    "typescript": "^5"
  }
}
EOF

# Update tsconfig.json
echo "Updating JustSplit tsconfig.json..."
cat > apps/justsplit/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [
      {
        "name": "next"
      }
    ],
    "strictNullChecks": true,
    "paths": {
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/context/*": ["./src/context/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@cybereco/shared-types": ["../../packages/shared-types/src"],
      "@cybereco/firebase-config": ["../../packages/firebase-config/src"],
      "@cybereco/ui-components": ["../../packages/ui-components/src"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
EOF

# Update next.config.js
echo "Updating JustSplit next.config.js..."
cat > apps/justsplit/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@cybereco/shared-types',
    '@cybereco/firebase-config',
    '@cybereco/ui-components'
  ],
  images: {
    unoptimized: true,
    domains: ['lh3.googleusercontent.com', 'firebasestorage.googleapis.com'],
  },
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
}

module.exports = nextConfig
EOF

echo "Migration complete! Next steps:"
echo "1. Install pnpm globally: npm install -g pnpm"
echo "2. Install dependencies: pnpm install"
echo "3. Update imports in JustSplit to use shared packages"
echo "4. Fix test failures"
echo "5. Run: pnpm dev:justsplit"