# JustSplit System Architecture

## Overview

The JustSplit application is designed as a client-side web application that facilitates the management of shared expenses. The architecture is structured to ensure flexibility, scalability, and ease of use, while prioritizing data privacy and security.

## Architecture Components

### 1. Client-Side Application

- **Frontend Framework**: The application is built using a modern JavaScript framework (e.g., React, Vue.js) to create a responsive and interactive user interface.
- **State Management**: Utilizes a state management library (e.g., Redux, Vuex) to manage application state efficiently across components.
- **Routing**: Implements client-side routing to enable seamless navigation between different views of the application.

### 2. External Services

- **Payment Integration**: The application plans to integrate with popular payment platforms such as PayPal and Venmo for handling transactions.
- **Currency Conversion API**: Utilizes an external API for real-time currency conversion to support multi-currency expense tracking.

### 3. Data Storage

- **Local Storage**: User data and expense records are stored in the browser's local storage to ensure quick access and offline functionality.
- **End-to-End Encryption**: All sensitive data is encrypted before storage to maintain user privacy and security.

## System Flow

1. **User Interaction**: Users interact with the application through the frontend interface, entering expenses and managing their shared budgets.
2. **Data Processing**: The application processes user inputs, calculates balances, and updates the state accordingly.
3. **External API Calls**: When necessary, the application makes calls to external APIs for payment processing and currency conversion.
4. **Data Storage**: Processed data is stored securely in local storage, ensuring that users can access their information even without an internet connection.

## Diagram

```plaintext
+------------------------------------------------------+
|                                                      |
|                   Client-Side App                    |
|                                                      |
| +------------------+  +-------------------------+    |
| |                  |  |                         |    |
| | Next.js Frontend |  | State Management        |    |
| | (App Router)     |  | (React Context/Redux)   |    |
| |                  |  |                         |    |
| +------------------+  +-------------------------+    |
|          |                        |                  |
+----------|------------------------|-----------------+
           |                        |
           v                        v
+----------+------------------------+------------------+
|                                                      |
|                 External Services                    |
|                                                      |
| +------------------+  +-------------------------+    |
| |                  |  |                         |    |
| | Payment APIs     |  | Currency Conversion     |    |
| | (PayPal, Venmo)  |  | APIs                    |    |
| |                  |  |                         |    |
| +------------------+  +-------------------------+    |
|                                                      |
+------------------------------------------------------+
           |                        |
           v                        v
+----------+------------------------+------------------+
|                                                      |
|                    Data Storage                      |
|                                                      |
| +-----------------------------------+                |
| |                                   |                |
| | Local Storage with End-to-End     |                |
| | Encryption                        |                |
| |                                   |                |
| +-----------------------------------+                |
|                                                      |
+------------------------------------------------------+
```

## Conclusion

The JustSplit system architecture is designed to provide a seamless user experience while ensuring data privacy and security. By leveraging modern web technologies and external services, JustSplit aims to simplify the process of managing shared expenses for users.