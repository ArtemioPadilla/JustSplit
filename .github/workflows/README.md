# GitHub Actions Workflows - Configuration Guide

## Fixed Issues ✅

### 1. Environment Configuration
- **Fixed**: Removed invalid `environment: production` from deploy workflows
- **Impact**: Workflows now run without environment validation errors

### 2. Dependency Installation
- **Fixed**: Added `--legacy-peer-deps` flag to all npm install commands
- **Impact**: Consistent dependency resolution across all workflows

### 3. Secret References with Fallbacks
- **Fixed**: Added fallback values (`|| ''`) to all secret references in deployment workflows
- **Impact**: Builds won't fail if optional secrets are missing

### 4. Secret Validation
- **Added**: Pre-deployment validation for required secrets
- **Impact**: Clear error messages if critical secrets are missing

## Required GitHub Secrets 🔑

### For JustSplit Deployment (`deploy-justsplit.yml`)
**Required:**
- `JUSTSPLIT_FIREBASE_PROJECT_ID` - Firebase project ID for JustSplit
- `FIREBASE_SERVICE_ACCOUNT_JUSTSPLIT` - Firebase service account key (JSON)

**Optional (have fallbacks):**
- `JUSTSPLIT_FIREBASE_API_KEY`
- `JUSTSPLIT_FIREBASE_AUTH_DOMAIN`
- `JUSTSPLIT_FIREBASE_STORAGE_BUCKET`
- `JUSTSPLIT_FIREBASE_MESSAGING_SENDER_ID`
- `JUSTSPLIT_FIREBASE_APP_ID`

### For Hub Deployment (`deploy-hub.yml`)
**Required:**
- `HUB_FIREBASE_PROJECT_ID` - Firebase project ID for Hub
- `FIREBASE_SERVICE_ACCOUNT_HUB` - Firebase service account key (JSON)

**Optional (have fallbacks):**
- `HUB_FIREBASE_API_KEY`
- `HUB_FIREBASE_AUTH_DOMAIN`
- `HUB_FIREBASE_STORAGE_BUCKET`
- `HUB_FIREBASE_MESSAGING_SENDER_ID`
- `HUB_FIREBASE_APP_ID`

## Workflow Triggers 🚀

### CI Workflow (`ci.yml`)
- Runs on: `push` to `main`/`develop`, `pull_request` to `main`/`develop`
- Jobs: `test`, `type-check`
- Uses NX affected commands for efficient testing

### Deploy JustSplit (`deploy-justsplit.yml`)
- Runs on: `push` to `main` (when `apps/justsplit/**`, `libs/**`, or `firebase/justsplit/**` changes)
- Manual trigger: `workflow_dispatch`
- Target: Firebase Hosting

### Deploy Hub (`deploy-hub.yml`)
- Runs on: `push` to `main` (when `apps/hub/**`, `libs/**`, or `firebase/hub/**` changes)
- Manual trigger: `workflow_dispatch`
- Target: Firebase Hosting

## Next Steps 📋

1. **Configure GitHub Secrets**: Add the required secrets in your GitHub repository settings
2. **Test Workflows**: Try manual triggers to test the deployment workflows
3. **Monitor Builds**: Check that CI runs successfully on pull requests

## Notes 📝

- The "Context access might be invalid" warnings are expected when secrets don't exist yet
- Fallback values ensure builds complete even with missing optional secrets
- Both apps are built and deployed independently based on changed files
- The validation steps will fail early if critical secrets are missing
