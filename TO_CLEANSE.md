# Files to Remove After Migration

This document lists files and directories that should be removed after the CyberEco migration is complete. These items are either redundant, outdated, or have been moved to more appropriate locations in the NX monorepo structure.


## Old Directory
After complete migration of the website:
- `/old/` - Complete directory can be removed once the website app is fully migrated and tested. For now we need to check the migration of both the app and test to the new app folder.

## Temporary Files
- `.firebase/` - Temporary Firebase directories
- `emulator-data/` - Can be regenerated as needed
- `coverage/` - Test coverage reports that can be regenerated
- `out/` - Build output directory
- `reports/` - Old report directories that can be regenerated

## App-Specific Cleanup

### JustSplit App
- `/apps/justsplit/coverage/` - Test coverage reports that can be regenerated
- `/apps/justsplit/reports/` - Report directories that can be regenerated
- `/apps/justsplit/*.test.tsx.bak` - Backup test files
- `/apps/justsplit/*.tsx.bak` - Backup component files
- `/apps/justsplit/*.tsx.new` - New versions that should be merged and cleaned up

## Post-Migration Verification Checklist

Before removing any files, verify that:

1. ✅ All logo files are correctly migrated to shared-assets library
2. ✅ The Logo component is properly implemented in ui-components
3. ✅ Hub app has necessary logo files in its public directory
4. ✅ JustSplit app has all its image assets in its public directory
5. ✅ No references to old file paths remain in the codebase
6. ✅ Build processes complete successfully after changes
7. ✅ Applications render correctly with the new logo implementation
8. ✅ Documentation is updated to reflect the new structure

## Migration Phase Cleanup

### Phase 1 (Logo Migration)
- [x] Move logo files to shared-assets
- [x] Implement Logo component
- [x] Update exports in ui-components
- [x] Move app-specific images to their app directories

### Phase 2 (Website Migration)
- [ ] Create website app
- [ ] Migrate components from old site
- [ ] Test website functionality
- [ ] Verify cross-app navigation

### Final Cleanup
- [ ] Remove all listed files and directories
- [ ] Update all references to use new paths
- [ ] Run full test suite to verify no regressions
- [ ] Commit cleaned codebase

## Notes

- Keep backup archives of removed content for at least 1-2 release cycles
- Update documentation to reflect new file structure
- If uncertain about a file, move it to an `archive` directory before permanent deletion