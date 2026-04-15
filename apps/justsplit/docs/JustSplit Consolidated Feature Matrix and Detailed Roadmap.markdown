# JustSplit Consolidated Feature Matrix and Detailed Roadmap

This document consolidates the features from `feature-roadmap.md` and `features.md` into a comprehensive feature matrix, incorporating a "Detail" column for each feature. It includes a detailed roadmap for planned features, categorized by priority, with expanded descriptions of goals, expected outcomes, and implementation considerations. The document improves on the originals by ensuring consistent naming, unified categorization, and clear prioritization.

## Feature Matrix

The feature matrix lists all unique features, including the four previously missing from `features.md` ("Dashboard fixes," "Enhance dashboard information," "Improve event visualization," "User list ordering with Firebase auth"). Features are grouped by category, with columns for Feature, Priority, Status, and Detail.

### Expense Management

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Add expenses manually                    | Must Have  | Implemented | Users can input expenses with description, amount, and date.         |
| Split expenses equally/custom/percentage | Must Have  | Implemented | Allow different methods to divide the amount among participants.     |
| Multi-currency support                   | Must Have  | Implemented | Support entry of expenses in different currencies.                   |
| Debt simplification                      | Must Have  | Implemented | Automatically calculate minimal transactions to settle debts.        |
| Scan receipts via OCR                    | Could Have | Planned | Use optical character recognition to extract text from receipts.     |
| Recurring expenses                       | Could Have | Planned | Create expenses that repeat on a schedule.                           |
| Manual expense settlement                | Must Have  | Planned     | Mark expenses as settled manually without automated balance logic.   |
| Settle probes  / test coverage | Should Have| Planned     | Add dummy settlements to validate calculations or simulate outcomes. |
| Expense Categories | Should Have| Planned     | Categorize Expenses to get depper insights into consumption habits. |

### UI/UX

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Progress bar for event expenses          | Should Have| Implemented     | Visual bar showing the percentage of expenses settled for an event.  |
| Event metrics on card                    | Should Have| Implemented     | Show total expenses, unsettled amount, and participants on event card. |
| Dashboard redesign/unification           | Should Have| Planned     | Unify visual style of dashboard with expenses and settlements tabs.  |
| Dashboard fixes                          | Should Have| Planned     | Address bugs and usability issues in the current dashboard.          |
| Enhance dashboard information            | Should Have| Planned     | Add key metrics and insights to the dashboard for quick access.      |
| Event filtering                          | Could Have | Planned     | Filter events by attributes like date, type, or status.              |
| Event timeline view                      | Should Have| Planned     | Chronological view of events with visual start/end indicators.       |
| Animated participant list                | Could Have | Planned     | Smooth animation for showing/hiding participant information.         |
| Enhanced typography for events           | Could Have | Planned     | Improve readability and visual hierarchy of event text.              |
| Improve event visualization              | Could Have | Planned     | Enhance the visual presentation of event details and summaries.      |
| Timeline view for events/expenses        | Should Have| Planned     | Unified visual tab showing events and expenses over time.            |
| Dark Mode | Planned     | Planned           | Implement Dark Mode for all the page and elements to display correctly

### Authentication & Data Security

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Local/global user distinction            | Must Have  | Planned     | Support both users that register and persons in event that don't have an account. Provide consolidation Methods.             |
| Firebase Auth integration                | Must Have  | Planned     | Secure login using Firebase authentication.                          |
| User consolidation (auth merging)        | Should Have| Planned     | Link multiple auth accounts to a single user profile.                |
| Firebase user access control             | Must Have  | Planned     | Restrict access to resources based on user roles via Firebase.       |
| Current User linked with Firebase auth    | Must Have|   Planned     | Link current user to Firebase auth, not first users in list.          |

### Collaboration

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Invite friends                           | Must Have  | Planned | Invite participants by link or email to join an event.               |
| In-app chat/comments on expenses         | Could Have | Planned | Allow users to comment on each expense entry.                        |
| Vote to approve expenses                 | Won't Have | Planned | Users vote before an expense is finalized.                           |
| Invite externals to platform/events      | Must Have  | Planned     | Let external users join via invite links.                            |

### Payments

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Payment integration (PayPal/Venmo)       | Should Have| Planned | Allow users to pay directly through supported platforms.             |
| Suggest payment method                   | Could Have | Planned     | Auto-suggest payment method based on user habits.                    |
| Direct payments without intermediaries   | Should Have| Planned     | Peer-to-peer payments using local banking rails.    Codi or Bank Transfer.                 |
| Direct payments with fees                | Could Have | Planned     | Payments routed through intermediaries with fees.  (Card payments)                   |
| KYC on card payment                      | Must Have  | Planned     | Trigger identity verification on certain payment types.              |

### Currency & Exchange

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Fallback Exchange Rates and Alerts             | Must Have  | Implemented     | Default fallback exchange rates to make the system work with approximates if no realtime data is available.                         |
| Yahoo! Finance Integration             | Must Have  | Implemented     | Basic Exchange rate info adquisition by Yahoo! Finance. To be improved.                         |
| ExchangeRate-API integration             | Must Have  | Planned     | Use Open Access API to fetch exchange rates.                         |
| ExchangeRate-API integration             | Must Have  | Planned     | Use Open Access API to fetch exchange rates.                         |
| Client-side FX caching                   | Should Have| Planned     | Cache exchange rates locally to minimize API requests.               |

### Communication

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Email notifications                      | Should Have| Planned     | Notify users via email of changes or reminders.                      |
| Social media sharing                     | Could Have | Planned     | Let users share event summaries or links on social media.            |

### Data & Analytics

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Analytics & charts                       | Could Have | Implemented | Visual representation of user and group spending over time. 
| Export to CSV                        | Should Have| Implemented | Allow export of event or expense data for record keeping.            
| Export to PDF                        | Should Have| Planned | Allow export of event or expense data for record keeping.            |         |

### Automation

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Reminder notifications                   | Should Have| Planned | Send reminders for unsettled expenses or due payments.               |
| Smart reminders based on behavior        | Should Have| Planned | Adaptive notifications based on user patterns.                       |

### AI & Intelligence

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| AI-based budget suggestions              | Could Have | Not Implemented | Suggest budgets or limits based on historical behavior.              |
| AR-based bill splitting                  | Won't Have | Not Implemented | Use augmented reality to visually split a bill on screen.            |
| Predictive debt conflict detection       | Won't Have | Not Implemented | AI flags users/groups with risky payment behavior.                   |
| Chat summarization of status             | Could Have | Not Implemented | Use AI to summarize financial status in natural language.            |

### Uncategorized

| Feature                                  | Priority   | Status      | Detail                                                               |
|------------------------------------------|------------|-------------|----------------------------------------------------------------------|
| Offline mode                             | Should Have| Implemented | Allow limited functionality without internet connectivity.           |
| Auto-payment with bank API               | Could Have | Not Implemented | Automate payments using bank APIs for seamless transactions.         |
| Planned         | Automatic fetch of expenses | Not Implemented | Automate expense ingestion with bank APIs, chatbots, etc

## Roadmap

The roadmap prioritizes planned features based on their importance to the JustSplit platform, divided into Must Have, Should Have, and Could Have categories. Each feature includes a detailed description of its goals, expected outcomes, and implementation considerations to guide development.

### Must Have (Planned)

- **Manual expense settlement (Expense Management)**  
  - **Goal**: Allow users to manually mark expenses as settled without relying on automated debt simplification logic.  
  - **Expected Outcome**: Increased flexibility for users who prefer manual control, improving trust and usability in complex group scenarios.  
  - **Implementation Considerations**: Update the expense database schema to include a "settled" status. Ensure UI supports toggling this status with clear confirmation prompts. Test edge cases where manual settlements conflict with automated calculations.

- **Firebase user access control (Authentication & Data Security)**  
  - **Goal**: Implement role-based access control via Firebase to restrict data access based on user roles (e.g., event admin vs. participant).  
  - **Expected Outcome**: Enhanced security and privacy, ensuring users only access relevant event and expense data.  
  - **Implementation Considerations**: Integrate Firebase Security Rules with the app’s data model. Requires thorough testing to prevent unauthorized access. May need to update backend APIs to enforce role checks.

- **Local/global user distinction (Authentication & Data Security)**  
  - **Goal**: Differentiate between local (device-only) and global (cloud-synced) user accounts.  
  - **Expected Outcome**: Flexibility for casual users (local) and committed users (global), improving onboarding and scalability.  
  - **Implementation Considerations**: Design a dual-account system in the backend. Ensure seamless transition from local to global accounts without data loss. Test performance impacts of local storage vs. cloud syncing.

- **Firebase Auth integration (Authentication & Data Security)**  
  - **Goal**: Enable secure user authentication using Firebase Authentication (e.g., email, Google, or phone login).  
  - **Expected Outcome**: Robust user authentication, reducing reliance on manual user management and improving security.  
  - **Implementation Considerations**: Integrate Firebase Auth SDK into the app. Support multiple auth providers while ensuring a smooth login flow. Handle account recovery and error states gracefully.

- **Invite externals to platform/events (Collaboration)**  
  - **Goal**: Allow users to invite non-registered users to join events or the platform via invite links.  
  - **Expected Outcome**: Increased user acquisition and event participation, making the app more accessible to new users.  
  - **Implementation Considerations**: Generate secure, time-limited invite links. Design an onboarding flow for external users to register or participate as guests. Ensure privacy by limiting guest access.

- **ExchangeRate-API integration (Currency & Exchange)**  
  - **Goal**: Replace Yahoo! Finance with the Open Access ExchangeRate-API for fetching exchange rates.  
  - **Expected Outcome**: Reliable, up-to-date currency conversion for multi-currency expenses, improving accuracy.  
  - **Implementation Considerations**: Integrate the API (https://www.exchangerate-api.com/docs/free) with client-side requests. Handle API rate limits (refreshes every 24 hours) and fallback mechanisms for failed requests.

- **KYC on card payment (Payments)**  
  - **Goal**: Implement Know Your Customer (KYC) verification for users making card payments.  
  - **Expected Outcome**: Compliance with financial regulations, enabling secure card-based transactions.  
  - **Implementation Considerations**: Partner with a KYC provider (e.g., Stripe Identity) to handle verification. Design a user-friendly KYC flow to minimize friction. Ensure data privacy compliance (e.g., GDPR).

- **User list ordering with Firebase auth (Authentication & Data Security)**  
  - **Goal**: Ensure the current user is correctly identified via Firebase auth, not assumed to be the first user in the list.  
  - **Expected Outcome**: Accurate user identification, preventing UI and data access errors.  
  - **Implementation Considerations**: Update user list logic to query Firebase auth for the current user’s ID. Refactor affected UI components (e.g., user selection dropdowns). Test for edge cases like missing auth data.

### Should Have (Planned)

- **Settle probes (Expense Management)**  
  - **Goal**: Enable dummy settlements to test settlement calculations or simulate outcomes without affecting real data.  
  - **Expected Outcome**: Improved debugging and user confidence in settlement logic, especially for complex events.  
  - **Implementation Considerations**: Create a sandbox mode for settlement simulations. Store probe data separately from live data to avoid contamination. Provide clear UI indicators for probe vs. actual settlements.

- **Dashboard redesign/unification (UI/UX)**  
  - **Goal**: Redesign the dashboard to align visually with expenses and settlements tabs.  
  - **Expected Outcome**: Consistent user experience, reducing learning curve and improving aesthetics.  
  - **Implementation Considerations**: Adopt a unified design system (e.g., Tailwind CSS) for consistent styling. Conduct user testing to validate design changes. Ensure responsiveness across devices.

- **Dashboard fixes (UI/UX)**  
  - **Goal**: Resolve bugs and usability issues in the current dashboard.  
  - **Expected Outcome**: Smoother user experience, reducing frustration and support requests.  
  - **Implementation Considerations**: Collect user feedback to prioritize fixes. Address performance issues (e.g., slow loading) and UI glitches. Test fixes across browsers and devices.

- **Enhance dashboard information (UI/UX)**  
  - **Goal**: Add key metrics (e.g., total expenses, pending settlements) to the dashboard.  
  - **Expected Outcome**: Quick access to critical insights, improving decision-making.  
  - **Implementation Considerations**: Design widgets for metrics display. Optimize database queries to fetch real-time data efficiently. Ensure metrics are customizable based on user preferences.

- **Progress bar for event expenses (UI/UX)**  
  - **Goal**: Display a progress bar showing the percentage of expenses settled for each event.  
  - **Expected Outcome**: Visual feedback on event settlement status, enhancing transparency.  
  - **Implementation Considerations**: Calculate settlement percentages in real-time. Design responsive progress bar components. Test visibility on small screens.

- **Event metrics on card (UI/UX)**  
  - **Goal**: Show total expenses, unsettled amount, and participant count on event cards.  
  - **Expected Outcome**: At-a-glance event summaries, reducing navigation effort.  
  - **Implementation Considerations**: Update event card templates to include metrics. Optimize data fetching for performance. Ensure metrics are updated in real-time.

- **Event timeline view (UI/UX)**  
  - **Goal**: Provide a chronological view of events with visual start/end indicators.  
  - **Expected Outcome**: Improved event planning and tracking, especially for overlapping events.  
  - **Implementation Considerations**: Use a timeline library (e.g., vis.js) for rendering. Support zooming and scrolling for large datasets. Test usability with complex event schedules.

- **Client-side FX caching (Currency & Exchange)**  
  - **Goal**: Cache exchange rates locally to reduce API requests, given the 24-hour refresh cycle.  
  - **Expected Outcome**: Faster currency conversions and reduced API costs.  
  - **Implementation Considerations**: Store rates in local storage with a 2-hour expiration. Implement fallback to cached rates on API failure. Monitor cache hit/miss rates.

- **Direct payments without intermediaries (Payments)**  
  - **Goal**: Enable peer-to-peer payments using local banking rails.  
  - **Expected Outcome**: Lower transaction costs and faster settlements for users.  
  - **Implementation Considerations**: Integrate with local payment APIs (e.g., SEPA for Europe). Ensure robust error handling for failed transactions. Verify regulatory compliance.

- **Email notifications (Communication)**  
  - **Goal**: Send email alerts for event changes, unsettled expenses, or reminders.  
  - **Expected Outcome**: Improved user engagement and timely action on pending tasks.  
  - **Implementation Considerations**: Use a transactional email service (e.g., SendGrid). Design customizable notification templates. Allow users to opt out of non-critical emails.

- **Timeline view for events/expenses (UI/UX)**  
  - **Goal**: Create a unified tab visualizing events and expenses over time with status indicators.  
  - **Expected Outcome**: Holistic view of financial activity, aiding planning and analysis.  
  - **Implementation Considerations**: Build a timeline UI with filtering by status (e.g., settled, pending). Optimize for large datasets. Ensure accessibility (e.g., screen reader support).

- **Smart reminders based on behavior (Automation)**  
  - **Goal**: Deliver adaptive notifications based on user interaction patterns.  
  - **Expected Outcome**: Higher response rates to reminders, reducing unsettled expenses.  
  - **Implementation Considerations**: Analyze user behavior (e.g., response times) to optimize reminder timing. Use a lightweight ML model for personalization. Test to avoid notification fatigue.

### Could Have (Planned)

- **Event filtering (UI/UX)**  
  - **Goal**: Allow users to filter events by date, type, or status via dropdowns or buttons.  
  - **Expected Outcome**: Easier event navigation, especially for users with many events.  
  - **Implementation Considerations**: Implement client-side filtering for performance. Support multi-criteria filtering. Test usability with diverse event datasets.

- **Animated participant list (UI/UX)**  
  - **Goal**: Add smooth animations when expanding/collapsing participant lists.  
  - **Expected Outcome**: Polished UI, enhancing perceived app quality.  
  - **Implementation Considerations**: Use CSS animations or a library (e.g., Framer Motion). Optimize for low-end devices. Ensure animations don’t disrupt accessibility.

- **Enhanced typography for events (UI/UX)**  
  - **Goal**: Use larger, bolder fonts for event titles and subtler fonts for secondary info.  
  - **Expected Outcome**: Improved readability and visual hierarchy for event details.  
  - **Implementation Considerations**: Update CSS typography rules. Test legibility across screen sizes. Ensure consistency with design system.

- **Improve event visualization (UI/UX)**  
  - **Goal**: Enhance the visual presentation of event details (e.g., charts, icons).  
  - **Expected Outcome**: More engaging and intuitive event summaries.  
  - **Implementation Considerations**: Experiment with visualization libraries (e.g., Chart.js). Gather user feedback on effective visuals. Balance aesthetics with performance.

- **Suggest payment method (Payments)**  
  - **Goal**: Recommend payment methods based on user habits or event context.  
  - **Expected Outcome**: Streamlined payment process, reducing decision fatigue.  
  - **Implementation Considerations**: Track user payment preferences in the backend. Implement a simple recommendation algorithm. Allow users to override suggestions.

- **Direct payments with fees (Payments)**  
  - **Goal**: Support payments via intermediaries (e.g., card processors) with fees.  
  - **Expected Outcome**: Additional payment flexibility for users preferring convenience.  
  - **Implementation Considerations**: Integrate with payment gateways (e.g., Stripe). Clearly display fees to users. Ensure compliance with fee disclosure regulations.

- **Social media sharing (Communication)**  
  - **Goal**: Enable sharing of event summaries or links on social media platforms.  
  - **Expected Outcome**: Increased app visibility and user engagement.  
  - **Implementation Considerations**: Use platform-specific sharing APIs (e.g., Twitter, WhatsApp). Design shareable content (e.g., event summaries). Monitor sharing analytics.

- **AI-based budget suggestions (AI & Intelligence)**  
  - **Goal**: Suggest spending limits based on historical user behavior.  
  - **Expected Outcome**: Better financial planning, reducing overspending.  
  - **Implementation Considerations**: Train a lightweight ML model on anonymized user data. Ensure transparency in suggestion logic. Address privacy concerns.

- **Chat summarization of status (AI & Intelligence)**  
  - **Goal**: Use AI to generate natural language summaries of financial status.  
  - **Expected Outcome**: Simplified understanding of complex event finances.  
  - **Implementation Considerations**: Integrate a text generation model (e.g., via API). Design concise, user-friendly summaries. Test accuracy with diverse scenarios.
