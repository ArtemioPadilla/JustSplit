# 📊 JustSplit Feature Matrix

This document contains a prioritized and categorized list of features for the JustSplit app, including implementation status and comparison to other apps.

## 🗂️ Feature Overview

| Feature                                  | Priority         | Source                    | Application                    | Status          | Category                       | Detail                                                               |
|:-----------------------------------------|:-----------------|:--------------------------|:-------------------------------|:----------------|:-------------------------------|:---------------------------------------------------------------------|
| Add expenses manually                    | Must Have        | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Users can input expenses with description, amount, and date.         |
| Split expenses equally/custom/percentage | Must Have        | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Allow different methods to divide the amount among participants.     |
| Multi-currency support                   | Must Have        | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Support entry of expenses in different currencies.                   |
| Debt simplification                      | Must Have        | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Automatically calculate minimal transactions to settle debts.        |
| Export to CSV/PDF                        | Should Have      | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Data & Analytics               | Allow export of event or expense data for record keeping.            |
| Scan receipts via OCR                    | Could Have       | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Use optical character recognition to extract text from receipts.     |
| Payment integration (PayPal/Venmo)       | Should Have      | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Payments                       | Allow users to pay directly through supported platforms.             |
| Recurring expenses                       | Could Have       | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Expense Management             | Create expenses that repeat on a schedule.                           |
| Offline mode                             | Should Have      | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Uncategorized                  | Description not available                                            |
| Analytics & charts                       | Could Have       | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Data & Analytics               | Visual representation of user and group spending over time.          |
| Reminder notifications                   | Should Have      | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Automation                     | Send reminders for unsettled expenses or due payments.               |
| Invite friends                           | Must Have        | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Collaboration                  | Invite participants by link or email to join an event.               |
| In-app chat/comments on expenses         | Could Have       | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Collaboration                  | Allow users to comment on each expense entry.                        |
| Vote to approve expenses                 | Won't Have (Now) | Competitor Apps           | Splitwise / Tricount / Splittr | Implemented     | Collaboration                  | Users vote before an expense is finalized.                           |
| AI-based budget suggestions              | Could Have       | Futuristic/Advanced Ideas | None yet                       | Not Implemented | AI & Intelligence              | Suggest budgets or limits based on historical behavior.              |
| AR-based bill splitting                  | Won't Have (Now) | Futuristic/Advanced Ideas | None yet                       | Not Implemented | AI & Intelligence              | Use augmented reality to visually split a bill on screen.            |
| Auto-payment with bank API               | Could Have       | Futuristic/Advanced Ideas | None yet                       | Not Implemented | Uncategorized                  | Description not available                                            |
| Predictive debt conflict detection       | Won't Have (Now) | Futuristic/Advanced Ideas | None yet                       | Not Implemented | AI & Intelligence              | AI flags users/groups with risky payment behavior.                   |
| Smart reminders based on behavior        | Should Have      | Futuristic/Advanced Ideas | None yet                       | Not Implemented | Automation                     | Adaptive notifications based on user patterns.                       |
| Chat summarization of status             | Could Have       | Futuristic/Advanced Ideas | None yet                       | Not Implemented | AI & Intelligence              | Use AI to summarize financial status in natural language.            |
| Dashboard redesign/unification           | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Description not available                                            |
| Manual expense settlement                | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Expense Management             | Mark expenses as settled manually without automated balance logic.   |
| Settle probes                            | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | Expense Management             | Add dummy settlements to validate calculations or simulate outcomes. |
| Firebase user access control             | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Authentication & Data Security | Restrict access to resources based on user roles via Firebase.       |
| Progress bar for event expenses          | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Visual bar showing the percentage of expenses settled.               |
| Event metrics on card                    | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Show total expenses, unsettled amount, and number of participants.   |
| Event filtering                          | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Filter events by attributes like date, type, or status.              |
| Event timeline view                      | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Chronological view of events with visual start/end indicators.       |
| Animated participant list                | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Smooth animation for showing/hiding participant information.         |
| Enhanced typography for events           | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Improve readability and visual hierarchy of text.                    |
| Local/global user distinction            | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Authentication & Data Security | Users stored locally or via persistent accounts.                     |
| Firebase Auth integration                | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Authentication & Data Security | Secure login using Firebase authentication.                          |
| User consolidation (auth merging)        | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | Authentication & Data Security | Link multiple auth accounts to a single user profile.                |
| Invite externals to platform/events      | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Collaboration                  | Let external users join via invite links.                            |
| ExchangeRate-API integration             | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Currency & Exchange            | Use Open Access API to fetch exchange rates.                         |
| Client-side FX caching                   | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | Currency & Exchange            | Cache exchange rates locally to minimize API requests.               |
| Suggest payment method                   | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | Payments                       | Auto-suggest payment method based on user habits.                    |
| Direct payments without intermediaries   | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | Payments                       | Peer-to-peer payments using local banking rails.                     |
| Direct payments with fees                | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | Payments                       | Payments routed through intermediaries with fees.                    |
| Email notifications                      | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | Communication                  | Notify users via email of changes or reminders.                      |
| Social media sharing                     | Could Have       | JustSplit Roadmap         | JustSplit                      | Planned         | Communication                  | Let users share event summaries or links on social media.            |
| KYC on card payment                      | Must Have        | JustSplit Roadmap         | JustSplit                      | Planned         | Payments                       | Trigger identity verification on certain payment types.              |
| Timeline view for events/expenses        | Should Have      | JustSplit Roadmap         | JustSplit                      | Planned         | UI/UX                          | Unified visual tab showing events and expenses over time.            |

> **Legend:**
> - **Priority:** Must Have / Should Have / Could Have / Won’t Have (MoSCoW)
> - **Status:** Implemented / Planned / Not Started
> - **Category:** Functional area of the app (e.g., Expense Management, Social, Integrations)
> - **Detail:** Brief explanation or clarification of the feature

## 📌 Notes

- Features were compiled by analyzing popular apps like Splitwise, Tricount, and Splittr.
- The matrix supports roadmap discussions and helps visualize gaps or differentiators.

---

Feel free to contribute by suggesting new features or updating the status of existing ones!

