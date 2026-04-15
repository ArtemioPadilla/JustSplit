# CyberEco Platform Deployment Guide

> **🌿 Sustainable Infrastructure**: This deployment guide reflects CyberEco's commitment to cost-effective, environmentally conscious hosting that supports digital sovereignty and community access.

## 🎯 Deployment Philosophy

Our deployment strategy embodies CyberEco values:

- **🌱 Sustainable Hosting**: Minimize environmental impact through efficient resource usage
- **🔐 Data Sovereignty**: Deploy with user data ownership and privacy as priorities
- **💰 Community Accessibility**: Keep operational costs low to ensure broad access
- **🔓 Transparent Operations**: Open deployment practices and clear cost structures

## Platform Overview

CyberEco uses a human-centered multi-project Firebase architecture:
- **Hub Project**: Mindful authentication and ecosystem coordination
- **App Projects**: Individual, sovereign application deployments

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase projects created (one for hub, one for each app)
3. Firebase CLI authenticated: `firebase login`

## Firebase Project Setup

### 1. Create Firebase Projects

Create two Firebase projects:
- `justsplit-hub` - For authentication
- `justsplit-app` - For the JustSplit application

### 2. Enable Required Services

For the Hub project:
- Enable Authentication (Email/Password, Google, etc.)
- Enable Firestore Database
- Enable Hosting

For the App project:
- Enable Firestore Database
- Enable Hosting
- Enable Storage (if needed)

### 3. Configure Firebase Files

The repository includes Firebase configuration in:
- `firebase/hub/` - Hub project configuration
- `firebase/justsplit/` - JustSplit app configuration

## Deployment Process

### Manual Deployment

#### Deploy the Hub
```bash
# Build and deploy
./scripts/deploy-hub.sh

# Or using NX directly
nx run hub:deploy
```

#### Deploy JustSplit
```bash
# Build and deploy
./scripts/deploy-justsplit.sh

# Or using NX directly
nx run justsplit-app:deploy
```

#### Deploy All Applications
```bash
# Deploy everything
./scripts/deploy-all.sh

# Or using NX
nx run-many --target=deploy --all
```

### Automated Deployment (CI/CD)

GitHub Actions workflows are configured for automatic deployment:
- `.github/workflows/deploy-hub.yml` - Deploys hub on changes
- `.github/workflows/deploy-justsplit.yml` - Deploys JustSplit on changes

#### Setting up GitHub Actions

1. Get your Firebase token:
   ```bash
   firebase login:ci
   ```

2. Add the token as a GitHub secret:
   - Go to Settings → Secrets → Actions
   - Add `FIREBASE_TOKEN` with your token

## Cost Optimization Strategies

### 1. Firestore Optimization

#### Document Structure
```typescript
// Bad: Nested reads
{
  user: {
    expenses: [...] // Large array
  }
}

// Good: Separate collections
users/userId
expenses/expenseId (with userId field)
```

#### Query Optimization
```typescript
// Bad: Reading all expenses
const expenses = await getDocs(collection(db, 'expenses'));

// Good: Paginated queries
const expenses = await getDocs(
  query(
    collection(db, 'expenses'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(20)
  )
);
```

### 2. Firebase Hosting Optimization

#### Static Generation
```javascript
// next.config.js
module.exports = {
  output: 'export', // For static export
  images: {
    unoptimized: true
  }
};
```

#### Cache Headers
```json
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

### 3. Authentication Optimization

- Use Firebase Auth session persistence
- Implement proper token refresh
- Cache user data locally

### 4. Free Tier Limits (as of 2024)

#### Firestore
- 1 GiB storage
- 50K reads/day
- 20K writes/day
- 20K deletes/day

#### Authentication
- Unlimited for email/password
- Limited for SMS/phone auth

#### Hosting
- 10 GB storage
- 360 MB/day bandwidth

## Monitoring Usage

### Firebase Console
1. Go to Firebase Console
2. Select your project
3. Check Usage tab for:
   - Firestore reads/writes
   - Storage usage
   - Bandwidth consumption

### Setting Up Alerts
```javascript
// Cloud Function for usage alerts
exports.checkUsage = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const usage = await getProjectUsage();
    if (usage.reads > 40000) { // 80% of limit
      await sendAlert('Approaching Firestore read limit');
    }
  });
```

## Security Configuration

### Firestore Rules
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Expenses accessible by participants
    match /expenses/{expenseId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.participants;
      allow write: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
  }
}
```

### Environment Variables
Never commit sensitive data. Use environment variables:
```bash
# .env.local (git ignored)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
FIREBASE_ADMIN_KEY=xxx
```

## Rollback Procedures

### Quick Rollback
```bash
# List recent deployments
firebase hosting:releases:list

# Rollback to previous version
firebase hosting:rollback
```

### Database Backup
```bash
# Export Firestore data
gcloud firestore export gs://your-backup-bucket

# Import Firestore data
gcloud firestore import gs://your-backup-bucket/backup-name
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node version compatibility
   - Clear NX cache: `nx reset`
   - Check environment variables

2. **Deployment Failures**
   - Verify Firebase authentication: `firebase login`
   - Check project selection: `firebase use --add`
   - Review firebase.json configuration

3. **Runtime Errors**
   - Check browser console for errors
   - Verify environment variables are set
   - Check Firestore rules for permission issues

### Debug Commands
```bash
# Check Firebase project
firebase projects:list

# Test hosting locally
firebase serve --only hosting

# Check deployment status
firebase hosting:channel:list
```

## Best Practices

1. **Use Preview Channels** for testing
   ```bash
   firebase hosting:channel:deploy preview
   ```

2. **Implement Gradual Rollouts**
   - Deploy to staging first
   - Monitor error rates
   - Deploy to production

3. **Set Up Monitoring**
   - Use Firebase Performance Monitoring
   - Set up error tracking
   - Monitor usage metrics

4. **Regular Backups**
   - Automated Firestore exports
   - Version control for rules
   - Document deployment procedures