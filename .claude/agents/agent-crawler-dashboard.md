---
name: agent-custom-crawler-dashboard
description: Implements a Crawler Dashboard by integrating with a custom crawler API via Convex
model: inherit
color: purple
---


# Agent: Crawler Dashboard Implementation with Custom API

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a real-time Crawler Dashboard in a Next.js application. It leverages Convex for backend logic, data storage, and real-time subscriptions, and integrates with a **custom-developed API (referred to as "Custom API" throughout this document)** that exposes health, performance, and operational data from the project's crawling infrastructure. Clerk handles user authentication and authorization.
**Tech Stack**: Next.js, React, Convex, Clerk, recharts (for charting)
**Source**: This guide is based on general best practices for Next.js, Convex, and external API integrations, tailored to the requirements of a custom-built crawler monitoring solution.

## Critical Implementation Knowledge

### 1. Understanding the "Custom API" Assumption 🚨
It is critical to clarify that "Custom API" in this context is assumed to refer to an **API that you develop and expose from your own crawling infrastructure**, not a specific third-party service named "Custom API". This API will serve as the interface to retrieve real-time metrics, control crawler processes (e.g., retry failed profiles), and access logs.

**Typical Custom API Endpoints might include:**
*   `/api/v1/crawler/status`: General health, error rates, active selector versions.
*   `/api/v1/crawler/performance`: Average crawl duration, profiles/posts per hour, queue depth.
*   `/api/v1/crawler/storage`: R2 usage, monthly costs, screenshots stored.
*   `/api/v1/crawler/vps`: VPS status (browsers, memory, disk).
*   `/api/v1/profiles`: List of profiles, details, status.
*   `/api/v1/profiles/{id}/retry`: Trigger a retry for a specific profile.
*   `/api/v1/errors`: Recent errors, details, export.

### 2. Convex Actions for External Integrations 🚨
Convex Actions are the cornerstone for interacting with your Custom API. They run in a Node.js environment, allowing you to make HTTP requests to external services, perform complex data transformations, and then persist relevant data to your Convex database via Mutations.

**Why Convex Actions are CRITICAL here:**
*   **Secure API Keys:** API keys for your Custom API (and potentially R2, if accessed directly for cost) can be securely stored as Convex environment variables, accessible only within Actions, not exposed to the client.
*   **Data Aggregation & Transformation:** Actions can fetch raw data from multiple Custom API endpoints, aggregate it, calculate derived metrics (e.g., error rate percentage), and format it before storing or returning it.
*   **Orchestration:** Coordinate multiple API calls to build a comprehensive dashboard state.
*   **Error Handling & Retries:** Implement robust error handling and retry logic for Custom API calls.
*   **Performance:** Offload heavy lifting from the client to the Convex backend.

### 3. Common Pitfalls & Solutions 🚨
*   **Exposing API Keys to Frontend:**
    *   **Pitfall:** Directly calling Custom API from Next.js frontend and embedding API keys.
    *   **Solution:** ALWAYS proxy Custom API calls through Convex Actions. Store API keys as Convex environment variables (e.g., `CUSTOM_CRAWLER_API_KEY`).
*   **Blocking UI with Direct API Calls:**
    *   **Pitfall:** Making direct, blocking API calls from `getServerSideProps` or client-side `useEffect` without proper loading states.
    *   **Solution:** Use Convex Actions with `useMutation` for triggering operations and `useQuery` for real-time data. Design your UI with loading states.
*   **Ignoring Rate Limits:**
    *   **Pitfall:** Hammering the Custom API without considering its rate limits, leading to IP bans or degraded performance.
    *   **Solution:** Implement rate limiting within your Custom API. In Convex Actions, consider adding debounce/throttle mechanisms for frequently triggered operations, or batch requests where possible.
*   **Inconsistent Data States:**
    *   **Pitfall:** Dashboard metrics not reflecting the latest data due to infrequent polling or lack of real-time updates.
    *   **Solution:** Store relevant Custom API data in Convex, then leverage Convex Queries for real-time subscriptions to the dashboard components. Trigger updates to Convex data via scheduled Convex Actions or on-demand mutations.
*   **Access Control Misconfigurations:**
    *   **Pitfall:** Allowing unauthorized users to view or interact with crawler controls.
    *   **Solution:** Implement Clerk-based authentication on the Next.js frontend and integrate it with Convex's authorization rules (`ctx.auth.getUserIdentity()`) to enforce admin-only access for dashboard views and actions.

### 4. Best Practices 🚨
*   **Modularity in Convex Actions:** Create dedicated Convex Actions for specific Custom API interactions (e.g., `fetchAndStoreCrawlerStatus`, `triggerProfileRetry`, `exportErrorLogs`).
*   **Real-time with Convex Queries:** Store fetched Custom API data in Convex tables (e.g., `crawler_metrics`, `crawler_errors`, `crawler_profiles`) and use `useQuery` in your Next.js components for real-time updates.
*   **Scheduled Actions for Polling:** For metrics that need periodic updates, use Convex Scheduled Actions to periodically poll the Custom API, update Convex tables, and thus keep your dashboard real-time.
*   **Robust Error Handling:** Implement `try...catch` blocks in Convex Actions for Custom API calls. Log errors, return meaningful error messages to the client.
*   **Data Validation:** Validate data received from the Custom API before persisting it to Convex.
*   **Role-Based Access Control (RBAC):** Use Clerk and Convex auth rules (`ctx.auth.getUserIdentity().customClaims.role === 'admin'`) to ensure only authorized users can access the dashboard and its features.
*   **Lazy Loading & Virtualization:** For tables with many entries (e.g., error logs, profiles), use lazy loading and UI virtualization techniques to maintain performance.

## Implementation Steps

### Backend Implementation (Convex)

1.  **Define Convex Schema:** Create Convex schema definitions (`convex/schema.ts`) for storing dashboard-related data.
    *   `crawler_metrics`: Stores aggregated real-time metrics (error rate, crawl duration, queue depth, R2 usage, VPS status).
    *   `crawler_errors`: Stores recent error messages, failed profiles.
    *   `crawler_profiles`: Stores profile list, status, selector versions.
    *   `admin_settings`: For dashboard-specific settings or thresholds.
    *   `users`: To store user roles (e.g., 'admin').

2.  **Create Convex Actions for Custom API Interaction:**
    *   Write Actions (`convex/crawlerActions.ts`) that make `fetch` requests to your Custom API endpoints.
    *   Implement error handling and data transformation.
    *   Use `ctx.runMutation` within Actions to persist processed data to Convex tables.
    *   Examples: `fetchAndStoreCrawlerMetrics`, `fetchAndStoreErrorLogs`, `triggerProfileRetry`.

3.  **Implement Convex Mutations for Data Storage:**
    *   Write Mutations (`convex/crawlerMutations.ts`) to save, update, or delete data in your Convex tables. These will primarily be called *from* Actions or for direct client-initiated changes (e.g., updating a profile's status).
    *   Examples: `updateCrawlerMetrics`, `addCrawlerError`, `updateProfileStatus`.

4.  **Develop Convex Queries for Real-time Data:**
    *   Write Queries (`convex/crawlerQueries.ts`) to retrieve data from your Convex tables. These will be subscribed to by your Next.js frontend components.
    *   Implement filtering, sorting, and pagination as needed for tables.
    *   Examples: `getDashboardMetrics`, `getRecentErrors`, `getProfilesPaginated`.

5.  **Set Up Convex Scheduled Actions:**
    *   For metrics that need periodic updates, configure scheduled Convex Actions (`convex/scheduler.ts`) to call your `fetchAndStore...` Actions at regular intervals (e.g., every minute for real-time metrics).

6.  **Implement Authorization Rules:**
    *   In your Convex Queries and Mutations, use `ctx.auth.getUserIdentity()` to check user roles (e.g., `identity.customClaims.role === 'admin'`) and restrict access to dashboard functions.

### Frontend Integration (Next.js)

1.  **Configure Clerk Authentication:**
    *   Integrate Clerk into your Next.js app for user management and authentication.
    *   Ensure user roles (e.g., `admin`) are assigned and accessible via `useUser()` or `useAuth()`.

2.  **Dashboard Layout & Components:**
    *   Create Next.js pages and components for the dashboard layout.
    *   Use `useQuery` from `convex/react` to subscribe to real-time data from your Convex Queries.
    *   Use `useMutation` from `convex/react` to trigger Convex Actions/Mutations (e.g., retry profile, export logs).

3.  **Charting with recharts:**
    *   Integrate recharts components to visualize metrics like error rate, crawl duration, profiles/posts per hour. Data will come from your `getDashboardMetrics` query.

4.  **Profile Management Table:**
    *   Display profile data from `getProfilesPaginated` in a table.
    *   Add filters, search, and action buttons (e.g., "Retry") that call Convex Mutations/Actions.

5.  **Error Log Export:**
    *   Create a button that triggers a Convex Action to generate a CSV from `crawler_errors` data and return a file URL, or stream the CSV directly.

6.  **Admin-Only Routes