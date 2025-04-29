# Release Planning for JustSplit

## Introduction

Release planning is a crucial aspect of the JustSplit project, ensuring that new features, improvements, and fixes are delivered in a structured and predictable manner. This document outlines the framework for planning releases, including versioning strategies, release notes, and the overall release process.

## Versioning Strategy

JustSplit follows [Semantic Versioning](https://semver.org/) (SemVer) for its versioning strategy. The version number is composed of three segments: `MAJOR.MINOR.PATCH`.

- **MAJOR** version: Incremented for incompatible API changes or significant feature additions.
- **MINOR** version: Incremented for backward-compatible feature enhancements.
- **PATCH** version: Incremented for backward-compatible bug fixes.

### Example Versioning

- **1.0.0**: Initial release
- **1.1.0**: Added multi-currency support
- **1.1.1**: Fixed a bug in expense calculations

## Release Process

1. **Feature Freeze**: A feature freeze period will be established before a release, during which no new features will be added. Only critical bug fixes will be allowed.
   
2. **Testing**: Comprehensive testing will be conducted, including unit tests, integration tests, and user acceptance testing (UAT).

3. **Release Candidate**: A release candidate (RC) will be created for final testing. This version should be feature-complete and stable.

4. **Release Notes**: Prepare detailed release notes that include:
   - New features
   - Bug fixes
   - Known issues
   - Upgrade instructions

5. **Deployment**: The release will be deployed to the production environment. Ensure that all deployment scripts and processes are followed.

6. **Post-Release Monitoring**: After deployment, monitor the application for any issues and gather user feedback.

## Release Notes Template

When preparing release notes, use the following template:

### Release X.Y.Z - Date

#### New Features
- Feature 1 description
- Feature 2 description

#### Bug Fixes
- Bug 1 description
- Bug 2 description

#### Known Issues
- Issue 1 description
- Issue 2 description

#### Upgrade Instructions
- Instructions for upgrading from previous versions.

## Conclusion

Effective release planning is essential for the success of the JustSplit project. By adhering to this framework, we can ensure that our releases are well-organized, predictable, and beneficial to our users.