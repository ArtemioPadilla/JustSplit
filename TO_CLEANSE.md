# Files to Remove After NX Migration

This document lists files and directories that should be removed after the CyberEco NX monorepo migration is complete. These items are either redundant, outdated, duplicated, or legacy artifacts from the pre-NX structure.

## 🚨 CRITICAL ROOT-LEVEL DUPLICATES (HIGH PRIORITY)

### Legacy Duplicate Directories
- **`/src/`** - ❌ **COMPLETE DUPLICATE** of `apps/justsplit/src/` but with outdated files and missing newer components (`error.tsx`, `global-error.tsx`, `not-found.tsx`). Contains legacy Pages Router code (`pages/_app.tsx`) while apps use App Router.
- **`/public/`** - ❌ **EMPTY DIRECTORY** serving no purpose in NX monorepo structure

### Build Artifacts and Cache Files (ROOT LEVEL)
- `/out/` - Next.js build output directory
- `/dist/` - Build distribution files  
- `/coverage/` - Test coverage reports (can be regenerated)
- `/tmp/` - Temporary build files with lib builds
- `/tsconfig.tsbuildinfo` - TypeScript build cache
- `*.log` files (`firestore-debug.log`, `database-debug.log`)

### Configuration File Conflicts
- `/next.config.js` - ⚠️ **REVIEW NEEDED** - Should only exist in individual apps, not at root level
- Root-level configs that should remain: `firebase.json`, `firestore.indexes.json` (multi-project setup)

## 🧹 LEGACY FILES FROM PRE-NX MIGRATION

### Old Website Structure
- **`/old/`** - ⚠️ **ARCHIVE FIRST** - Complete pre-migration React website code. Keep as backup for 1-2 releases, then remove.
  - Contains legacy React app structure (non-Next.js)
  - Original website components with different styling approach
  - Old package.json and dependencies

### Backup and Version Files (.bak, .new, .backup)
**ROOT LEVEL:**
- `/src/app/groups/new/page.tsx.new`
- `/src/app/landing/page.tsx.new`  
- `/src/app/page.tsx.bak`
- `/src/app/page.tsx.new`

**APPS/JUSTSPLIT:**
- `/apps/justsplit/src/app/page.tsx.new`
- `/apps/justsplit/src/app/landing/page.tsx.new`
- `/apps/justsplit/src/app/groups/new/page.tsx.new`
- `/apps/justsplit/src/app/page.tsx.bak`

**APPS/WEBSITE:**
- `/apps/website/src/translations/index.ts.backup`
- `/apps/website/src/translations/index.ts.original`

## 📱 APP-SPECIFIC BUILD ARTIFACTS

### JustSplit App Cleanup
- `/apps/justsplit/coverage/` - Test coverage reports (regenerable)
- `/apps/justsplit/out/` - Next.js build output
- `/apps/justsplit/reports/` - Test report files
- `/apps/justsplit/firebase-debug.log` - Development log files
- `/apps/justsplit/tsconfig.tsbuildinfo` - TypeScript build cache

### Website App Cleanup  
- `/apps/website/out/` - Static export build output
- `/apps/website/tsconfig.tsbuildinfo` - TypeScript build cache

### Hub App Cleanup
- `/apps/hub/tsconfig.tsbuildinfo` - TypeScript build cache

## 📚 LIBRARY DEPENDENCY ARTIFACTS

### Redundant node_modules in Libraries
Libraries should use workspace dependencies, not individual installations:
- `/libs/firebase-config/node_modules/` - Should use workspace deps
- `/libs/shared-types/node_modules/` - Should use workspace deps  
- `/libs/ui-components/node_modules/` - Should use workspace deps

## 🔄 TEMPORARY/DEVELOPMENT FILES

### Firebase Development Files
- `emulator-data/` - Can be regenerated (but useful to keep for dev)
- `.firebase/` - Temporary Firebase directories

### Other Development Artifacts
- `reports/` - Root-level report directory (can be regenerated)
- `/next-env.d.ts` - Should only be in individual apps

## ✅ IMMEDIATE SAFE DELETIONS (HIGH PRIORITY)

```bash
# Root level duplicates and artifacts
rm -rf src/
rm -rf public/
rm -rf out/
rm -rf dist/
rm -rf coverage/
rm -rf tmp/
rm tsconfig.tsbuildinfo
rm *-debug.log
rm next-env.d.ts

# App level build artifacts  
rm -rf apps/*/coverage/
rm -rf apps/*/out/
rm -rf apps/*/reports/
rm apps/*/*-debug.log
rm apps/*/tsconfig.tsbuildinfo

# Library node_modules (use workspace deps)
rm -rf libs/*/node_modules/
```

## ⚠️ REVIEW BEFORE DELETION (MEDIUM PRIORITY)

```bash
# Backup files - check for important changes first
find . -name "*.bak" -o -name "*.new" -o -name "*.backup"

# Root next.config.js - verify not needed for monorepo
# Check if this conflicts with individual app configs
```

## 📋 ARCHIVE BEFORE DELETION (LOW PRIORITY)

```bash
# Keep old website as backup for 1-2 releases
mv old/ archived-old-website-$(date +%Y%m%d)/
```

## 🎯 POST-MIGRATION VERIFICATION CHECKLIST

Before removing any files, verify that:

1. ✅ **All logo files are correctly migrated to shared-assets library**
2. ✅ **The Logo component is properly implemented in ui-components**  
3. ✅ **Hub app has necessary logo files in its public directory**
4. ✅ **JustSplit app has all its image assets in its public directory**
5. ✅ **Website app functions correctly with shared components**
6. ✅ **No references to old file paths remain in the codebase**
7. ✅ **All apps build successfully after cleanup**
8. ✅ **All apps serve correctly in development mode**
9. ✅ **Test suites pass after cleanup**
10. ✅ **Firebase deployments work for all apps**

## 📈 MIGRATION PHASES

### Phase 1 (Logo/Assets Migration) ✅ COMPLETE
- [x] Move logo files to shared-assets
- [x] Implement Logo component in ui-components
- [x] Update exports in ui-components
- [x] Move app-specific images to their app directories

### Phase 2 (Code Structure Cleanup) 🔄 IN PROGRESS
- [x] Identify duplicate root directories
- [x] Catalog backup and version files
- [ ] Review .new/.bak files for important changes
- [ ] Remove safe-to-delete build artifacts
- [ ] Clean up library node_modules

### Phase 3 (Legacy Website Archive) 🕐 PENDING
- [ ] Verify website app functionality matches old site
- [ ] Archive old/ directory with timestamp
- [ ] Remove archived directory after 1-2 releases

### Phase 4 (Final Cleanup) 🕐 PENDING
- [ ] Remove all root-level duplicates
- [ ] Clean all build artifacts across apps
- [ ] Update any remaining references to use new paths
- [ ] Run comprehensive test suite
- [ ] Document cleaned structure
- [ ] Commit final cleaned codebase

## 📝 CLEANUP EXECUTION COMMANDS

### Step 1: Safe Immediate Cleanup
```bash
# Remove build artifacts and caches
rm -rf src/ public/ out/ dist/ coverage/ tmp/
rm tsconfig.tsbuildinfo *-debug.log next-env.d.ts
rm -rf apps/*/coverage/ apps/*/out/ apps/*/reports/
rm apps/*/*-debug.log apps/*/tsconfig.tsbuildinfo
rm -rf libs/*/node_modules/
```

### Step 2: Review and Clean Backup Files
```bash
# List all backup files for review
find . -name "*.bak" -o -name "*.new" -o -name "*.backup" -o -name "*.original"

# After review, remove backup files
find . -name "*.bak" -delete
find . -name "*.new" -delete  
find . -name "*.backup" -delete
find . -name "*.original" -delete
```

### Step 3: Archive Legacy Code
```bash
# Archive old website with timestamp
mkdir -p archived/
mv old/ archived/old-website-$(date +%Y%m%d)/
```

## 📊 CURRENT STATUS SUMMARY

- 🔴 **Root `/src/` directory**: Complete outdated duplicate - SAFE TO DELETE
- 🔴 **Root `/public/` directory**: Empty unused directory - SAFE TO DELETE  
- 🟡 **Build artifacts**: Standard cleanup across all apps - SAFE TO DELETE
- 🟡 **Backup files**: Need content review before deletion
- 🟡 **Old directory**: Functional but legacy - ARCHIVE THEN DELETE
- 🟢 **NX structure**: Properly configured and working
- 🟢 **Shared libraries**: Functioning correctly
- 🟢 **Multi-app setup**: Hub, JustSplit, Website all operational

## 📌 IMPORTANT NOTES

- **Always backup before deletion** - Git provides version history, but create archives for major structural changes
- **Test after each cleanup phase** - Ensure all apps build and run correctly
- **Update documentation** - Reflect new file structure in README and docs
- **Coordinate with team** - Ensure all developers understand the new structure
- **Monitor deployment** - Verify Firebase hosting works after cleanup