# Non-Functional Requirements

Non-functional requirements define the quality attributes, system performance, and constraints of the JustSplit application. These requirements ensure that the system meets user expectations and operates effectively in various environments.

## Performance

- The application should load within 2 seconds on a standard broadband connection.
- The system should handle up to 100 concurrent users without performance degradation.
- All calculations and data processing should be completed within 1 second for a seamless user experience.

## Security

- User data must be encrypted both in transit and at rest to ensure privacy and security.
- The application should implement OAuth 2.0 for secure user authentication and authorization.
- Regular security audits must be conducted to identify and mitigate vulnerabilities.

## Usability

- The application should have an intuitive user interface that allows users to complete tasks with minimal effort.
- User documentation and help resources should be readily available within the application.
- The system should support accessibility standards (e.g., WCAG 2.1) to ensure usability for all users, including those with disabilities.

## Reliability

- The application should have an uptime of 99.9% to ensure availability for users.
- Data backups must be performed daily to prevent data loss in case of system failure.
- The system should provide error handling and user-friendly error messages to guide users in case of issues.

## Scalability

- The architecture should support horizontal scaling to accommodate increasing user loads.
- The application should be designed to allow for easy integration of new features and services without significant rework.

## Compatibility

- The application must be compatible with major web browsers (Chrome, Firefox, Safari, Edge) and mobile devices.
- The system should support multiple currencies and localization for different regions.

## Maintainability

- The codebase should follow established coding standards and best practices to facilitate maintenance and updates.
- Comprehensive documentation must be provided for all components of the system to aid future developers.

## Portability

- The application should be deployable on various static hosting platforms, including GitHub Pages, with minimal configuration changes.
- The system should be designed to run on any modern web browser without requiring additional plugins or installations.