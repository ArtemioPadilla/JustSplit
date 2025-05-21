# Firebase Deployment Guide

This document provides instructions for deploying the JustSplit application to Firebase.

## Prerequisites

Before you begin, ensure you have the following:

- [Firebase CLI](https://firebase.google.com/docs/cli) installed
- Firebase project created
- Proper permissions to deploy to the Firebase project

You can install the Firebase CLI using npm:

```bash
npm install -g firebase-tools
```

## Authentication

Log in to Firebase:

```bash
firebase login
```

## Deployment Process

### Full Deployment

To build and deploy the entire application (hosting and Firestore rules):

```bash
npm run deploy
```

This command:
1. Builds your Next.js application with static export
2. Deploys your application to Firebase Hosting
3. Deploys your Firestore rules

### Partial Deployments

#### Deploy only Firestore rules

```bash
npm run deploy:rules
```

#### Deploy only Hosting

```bash
npm run deploy:hosting
```

## Continuous Deployment (GitHub Actions)

You can set up GitHub Actions to automatically deploy your application when changes are pushed to the main branch. Create a GitHub Actions workflow file at `.github/workflows/firebase-deploy.yml` with the following content:

```yaml
name: Firebase Deploy

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build:firebase
        env:
          NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
        
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

## Troubleshooting

### Common Issues

1. **"Error: Error parsing firebase.json"**
   - Check your firebase.json file syntax

2. **"Error: No sites were found in your firebase.json"**
   - Make sure the "hosting" section is correctly configured

3. **"Error: HTTP Error: 403, Unknown Error"**
   - Check if you're logged in with the correct Firebase account
   - Verify you have the necessary permissions for the project

4. **"Error: Failed to get Firebase project. Please make sure the project exists and your account has permission to access it."**
   - Run `firebase use --add` and select your project

### Accessing Deployed Application

After successful deployment, your application will be accessible at:
- `https://justsplit-eef51.web.app/`
- `https://justsplit-eef51.firebaseapp.com/`

### Viewing Deployment History

To view your deployment history:

```bash
firebase hosting:sites:list
```
