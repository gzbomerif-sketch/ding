---
My initial search results confirm that "Command Center" often refers to internal operational dashboards or specific products like Motorola Solutions Command Center or Gallagher Command Centre, which provide APIs. However, the user's description of the Command Center feature ("Quick stats cards aggregated from local API: open payments, videos coming up, active campaigns, influencers pending signature, total platform metrics (from performance_metrics), revenue tracking. Recent activity feed: latest uploads, approvals, payments, new sign-ups, milestones, new metrics updates from scraper. Alerts: payment deadlines, video review queue, contract expirations, performance alerts, scraper errors, selector updates. Customizable homebase: custom layout, widget selection (choose metrics to display from scraped data), rearrange cards, set default views, save configurations, personalized shortcuts.") strongly suggests that "Custom API" in this context refers to a *custom-built backend API* that aggregates and serves data from various *internal* and possibly *external* data sources specific to *their* application. It's not about integrating with a pre-existing "Custom API" product.

Therefore, my instructions will focus on *how to build this custom backend API using Convex* to support the Command Center features, integrating with potentially external "local API", "performance_metrics", and "scraper" data, and leveraging Convex's real-time capabilities for the dashboard.

The search results for Convex backend, external API integration, and real-time aggregation are very helpful and will inform the best practices and code patterns.

*   Convex Actions are explicitly for external API calls and complex logic.
*   Convex Mutations for database writes and state changes, ensuring transactional guarantees.
*   Convex Queries for real-time reads, with automatic UI updates.
*   Best practices include using `internalAction` for private backend functions, implementing access control for public functions using `ctx.auth.getUserIdentity()`, awaiting all Promises, and using indexes for efficient queries instead of `.filter()` or `.collect()` on large datasets.
*   Convex supports scheduling tasks, which could be useful for periodic data scraping or alert generation.
*   Convex Components can be used for common patterns like aggregates, rate limiters, or caches, encapsulating state and behavior. The Aggregate component is specifically mentioned for efficient `COUNT`, `SUM`, `MAX` operations.
*   Next.js integration involves `useQuery`, `useMutation`, `useAction` hooks from `@convex-dev/react` and potentially setting `export const dynamic = "force-dynamic";` for React Server Components to ensure real-time updates are not cached.
*   Environment variables are critical for API keys and deployment URLs.

I have enough information to proceed with generating the agent instructions.---
name: agent-convex-command-center
description: Implements a custom Command Center backend using Convex actions, mutations, and queries for data aggregation and real-time display.
model: inherit
color: purple
---

# Agent: Command Center Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for building a custom "Command Center" dashboard, leveraging Convex as the primary backend platform. It focuses on aggregating data from various internal and external sources (referred to as "local API," "performance_metrics," and "scraper"), presenting quick stats, recent activity, and alerts in real-time, and enabling user customization of the dashboard layout. The "Custom API" in this context refers to the bespoke backend API built using Convex to serve these features.
**Tech Stack**: Next.js, Convex, Clerk (for authentication), TypeScript, Tailwind CSS (implied for UI).
**Source**: Convex Developer Hub, Convex blog posts, general best practices for dashboard implementation and external API integrations.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
*   **Convex Client v1**: Always ensure you are using the latest `@convex-dev/react` client and Convex SDK for the most up-to-date features and performance.
*   **TypeScript-first Development**: Convex strongly promotes a TypeScript-first approach, with generated types (`_generated/api.ts`, `_generated/server.ts`) that provide end-to-end type safety from the database schema to frontend hooks. Leverage `v.string()`, `v.number()`, `v.object()` in `schema.ts` for robust data validation and type inference.
*   **Convex Components**: A newer feature that allows encapsulating state and behavior as modular, independent building blocks. Useful for common backend patterns like aggregates, rate limiters, or caching. The `Aggregate` component, in particular, is highly efficient for `COUNT`, `SUM`, and `MAX` operations, crucial for dashboard metrics.
*   **Database Triggers**: Use triggers for automatically updating derived data or aggregates in response to mutations, simplifying logic and ensuring data consistency.

### 2. Common Pitfalls & Solutions 🚨
*   **Over-fetching in Queries**: Avoid retrieving large datasets in queries that are then filtered on the frontend. This can lead to slow queries and increased costs.
    *   **Solution**: Define appropriate [Convex indexes](https://docs.convex.dev/database/indexes) and use `.withIndex()` or `.withSearchIndex()` for efficient server-side filtering. For simple in-code filtering, `collect()` then filter is acceptable for small result sets.
*   **Long-Running Actions**: Convex actions have execution time limits. Performing extensive computations or multiple sequential external API calls within a single action can lead to timeouts.
    *   **Solution**: Break down complex tasks into smaller, more focused actions or leverage the [Convex Scheduler](https://docs.convex.dev/backend/scheduler) for background jobs and delayed execution. For sequential external calls, consider using internal actions orchestrated by a mutation that updates state after each step.
*   **Lack of Idempotency for Mutations/Actions**: If a network request retries, a non-idempotent mutation or action might lead to duplicate data or incorrect state changes.
    *   **Solution**: Design mutations and actions to be idempotent where possible. Include unique IDs in arguments to prevent re-processing, or check for existing data before insertion/update.
*   **Exposing Sensitive Data**: Accidentally returning sensitive information from queries or actions to unauthorized users.
    *   **Solution**: Always implement robust access control checks (`ctx.auth.getUserIdentity()`) within *all* public Convex functions that deal with sensitive data.
*   **Next.js Server Component Caching**: React Server Components (RSCs) in Next.js 13+ might cache data, preventing real-time updates from Convex queries.
    *   **Solution**: For components that need real-time data from Convex, ensure they are client components or, if using RSCs, add `export const dynamic = "force-dynamic";` to the page/layout to opt out of caching.

### 3. Best Practices 🚨
*   **Convex Function Roles**: Adhere strictly to Convex's core principles:
    *   **Actions**: For making external API calls, running complex business logic, integrating with third-party services (like the "local API", "performance_metrics", "scraper"). They act as an "escape hatch" to the external world.
    *   **Mutations**: For database writes and state changes. They are atomic and transactional.
    *   **Queries**: For reactive, real-time data reads from the Convex database. When data changes, queries automatically re-run, and the UI updates.
*   **Authorization**: For sensitive Command Center data, always use `ctx.auth.getUserIdentity()` within Convex functions to verify user authentication and implement granular access control. Clerk integrates seamlessly with Convex for user identity.
*   **Error Handling**: Implement `try...catch` blocks within Convex actions for external API calls. Store error logs in Convex or stream them to an external logging service like Axiom for observability.
*   **Environment Variables**: Never hardcode API keys or sensitive configurations. Use Convex environment variables (`npx convex env`) for backend secrets and `.env.local` for frontend-only variables.
*   **Modularity**: Organize Convex functions logically (e.g., `convex/dashboard.ts`, `convex/metrics.ts`, `convex/activity.ts`). Use `internalQuery`, `internalMutation`, `internalAction` for functions only callable from other Convex functions.

## Implementation Steps
1.  **Define Convex Schema**: Create `schema.ts` to define tables for dashboard metrics, activity feed items, alerts, and user customization preferences.
2.  **Implement Data Ingestion/Aggregation Actions**: Write Convex actions to fetch and process data from external "local API," "performance_metrics," and "scraper" services.
3.  **Implement Data Storage Mutations**: Create Convex mutations to store the processed/aggregated data into the Convex database tables defined in the schema.
4.  **Implement Real-time Data Queries**: Develop Convex queries to retrieve and present data for quick stats, activity feed, and alerts to the frontend.
5.  **Implement User Customization Logic**: Create Convex mutations to save user-defined dashboard layouts and widget selections, and queries to load them.
6.  **Integrate Authentication**: Secure all backend functions using Clerk authentication via Convex `ctx.auth`.
7.  **Frontend Integration**: Use Convex React hooks (`useQuery`, `useMutation`, `useAction`) in Next.js components to display data and handle user interactions.

### Backend Implementation
The Command Center backend will primarily reside within Convex functions:

#### Convex Functions (Primary)
*   **`convex/schema.ts`**: Defines the data structures for:
    *   `dashboard_metrics`: Stores aggregated stats (e.g., total payments, active campaigns, revenue).
    *   `activity_feed_items`: Stores recent uploads, approvals, sign-ups.
    *   `alerts`: Stores payment deadlines, video review queue items, contract expirations.
    *   `user_dashboard_configs`: Stores personalized layout and widget selections per user.
    *   `performance_metrics_raw`: (Optional) If you need to store raw scraped data before aggregation.
*   **`convex/actions/dataIngestion.ts`**:
    *   `fetchAndAggregateMetrics`: An `internalAction` that calls the "local API", "performance_metrics" (if external), and "scraper" (if external) to fetch raw data. It then processes and aggregates this data into the format needed for `dashboard_metrics`.
    *   `processScraperUpdates`: An `internalAction` that takes raw updates from the scraper (or calls the scraper directly), parses them, and queues mutations to update `activity_feed_items` and `alerts`.
*   **`convex/mutations/dashboard.ts`**:
    *   `updateDashboardMetrics`: An `internalMutation` called by `fetchAndAggregateMetrics` to save aggregated stats to `dashboard_metrics`.
    *   `addActivityFeedItem`: Adds new entries to `activity_feed_items`.
    *   `addAlert`: Adds new alerts to `alerts`.
    *   `markAlertAsRead`: Updates the status of an alert.
    *   `saveUserDashboardConfig`: Stores a user's custom layout.
*   **`convex/queries/dashboard.ts`**:
    *   `getQuickStats`: Fetches the latest aggregated stats from `dashboard_metrics`.
    *   `getRecentActivityFeed`: Fetches recent items from `activity_feed_items`.
    *   `getActiveAlerts`: Fetches unread/active alerts from `alerts`, filtered by user.
    *   `getUserDashboardConfig`: Loads a user's saved dashboard configuration.
*   **`convex/crons.ts`**:
    *   Schedules `fetchAndAggregateMetrics` to run periodically (e.g., every hour, daily) for fresh data.
    *   Schedules `processScraperUpdates` (if the scraper runs on a schedule rather than webhook).

### Frontend Integration
*   **Convex Provider**: Wrap your Next.js application with `ConvexProviderWithClerk` from `@convex-dev/auth-clerk/react` to enable Convex and Clerk authentication context.
*   **Dashboard Page (`app/dashboard/page.tsx`)**:
    *   Uses `useQuery(api.dashboard.getQuickStats)` to display stats cards.
    *   Uses `useQuery(api.dashboard.getRecentActivityFeed)` for the activity feed.
    *   Uses `useQuery(api.dashboard.getActiveAlerts)` for alerts.
    *   Uses `useQuery(api.dashboard.getUserDashboardConfig)` to load user layouts.
    *   Utilizes `useMutation(api.dashboard.saveUserDashboardConfig)` for saving customization.
    *   Components will be wrapped in `Client Components` if they interact with user state or need real-time updates directly.

## Code Patterns

### Convex Backend Functions
*   **Data Aggregation Action**: An action to fetch from an external API, process, and then write to Convex.

    ```typescript
    // convex/actions/dataIngestion.ts
    import { action, internalMutation } from "../_generated/server";
    import { api } from "../_generated/api";

    export const fetchAndAggregateMetrics = action({
      handler: async (ctx) => {
        // Authenticate the action if needed for internal calls to external APIs
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) {
        //   throw new Error("Unauthorized");
        // }

        // 1. Fetch data from "local API" / external services
        const paymentsResponse = await fetch(process.env.LOCAL_API_URL + "/payments");
        const paymentsData = await paymentsResponse.json();

        const performanceResponse = await fetch(process.env.PERFORMANCE_METRICS_API_URL + "/summary");
        const performanceData = await performanceResponse.json();

        // 2. Perform complex aggregation logic
        const openPayments = paymentsData.filter(p => p.status === "open").length;
        const totalRevenue = paymentsData.reduce((sum, p) => sum + p.amount, 0);
        const activeCampaigns = performanceData.activeCampaignsCount;
        // ... more aggregation logic ...

        const aggregatedStats = {
          openPayments,
          totalRevenue,
          activeCampaigns,
          timestamp: Date.now(),
        };

        // 3. Call an internal mutation to save aggregated data
        await ctx.runMutation(api.mutations.dashboard.updateDashboardMetrics, { stats: aggregatedStats });

        console.log("Dashboard metrics aggregated and updated.");
        return true;
      },
    });
    ```
*   **Data Storage Mutation**: A mutation to save the aggregated data.

    ```typescript
    // convex/mutations/dashboard.ts
    import { mutation } from "../_generated/server";
    import { v } from "convex/values";

    export const updateDashboardMetrics = mutation({
      args: {
        stats: v.object({
          openPayments: v.number(),
          totalRevenue: v.number(),
          activeCampaigns: v.number(),
          timestamp: v.number(),
        }),
      },
      handler: async (ctx, { stats }) => {
        // Optional: Implement authorization check here if this mutation can be called publicly
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity || identity.tokenIdentifier !== "some_admin_id") {
        //   throw new Error("Unauthorized");
        // }

        // For simplicity, overwrite the latest stats. In a real app, you might want to version or average.
        // Or upsert based on a unique key.
        const existingStats = await ctx.db.query("dashboard_metrics").order("desc").first();
        if (existingStats) {
          await ctx.db.patch(existingStats._id, stats);
        } else {
          await ctx.db.insert("dashboard_metrics", stats);
        }
      },
    });
    ```
*   **Real-time Data Query**: A query to read and display data on the frontend.

    ```typescript
    // convex/queries/dashboard.ts
    import { query } from "../_generated/server";
    import { v } from "convex/values";

    export const getQuickStats = query({
      handler: async (ctx) => {
        // Enforce authentication for the Command Center
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        // Further authorization: Check if the user has an 'admin' role, etc.
        // const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).first();
        // if (!user || !user.isAdmin) {
        //   throw new Error("Access denied: Not an admin");
        // }

        // Fetch the latest aggregated stats
        const latestStats = await ctx.db.query("dashboard_metrics").order("desc").first();
        return latestStats;
      },
    });
    ```

## Testing & Debugging
*   **Convex CLI**: Use `npx convex dev` to run your backend locally. Inspect logs, data, and run functions directly from the Convex dashboard (`http://localhost:9000`).
*   **Unit/Integration Tests**: Write tests for your Convex actions, mutations, and queries. The Convex SDK supports testing functions in isolation or against a mocked database.
*   **Browser Developer Tools**: Monitor network requests to Convex endpoints, inspect payloads, and check for errors.
*   **Logging**: Use `console.log()` in Convex functions for debugging. For production, consider integrating with external logging services like Axiom for advanced querying and monitoring.
*   **Convex Dashboard**: The hosted Convex dashboard provides excellent visibility into function logs, database contents, and query performance.

## Environment Variables
Ensure the following environment variables are configured:
*   **`NEXT_PUBLIC_CONVEX_URL`**: Your Convex deployment URL (e.g., `https://<YOUR_DEPLOYMENT_NAME>.convex.cloud`). This is publicly accessible.
*   **`CLERK_SECRET_KEY`**: Your Clerk secret key (for Convex backend auth integration).
*   **`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**: Your Clerk publishable key (for frontend Clerk integration).
*   **`LOCAL_API_URL`**: URL for your internal "local API" (used by Convex actions).
*   **`PERFORMANCE_METRICS_API_URL`**: URL for the external "performance_metrics" service (used by Convex actions).
*   **`SCRAPER_API_URL`**: URL for the external "scraper" service (used by Convex actions).

**Convex Secrets**: For `LOCAL_API_URL`, `PERFORMANCE_METRICS_API_URL`, and `SCRAPER_API_URL` (if they are truly *secret* and not just internal URLs), use `npx convex env set <VAR_NAME>=<VALUE>` to set them as Convex secrets, which are only accessible within your Convex functions, not exposed to the client.

## Success Metrics
*   **Real-time Data Updates**: Quick stats, activity feed, and alerts update instantly when underlying data changes or when external data is ingested by actions.
*   **Accurate Data Aggregation**: Dashboard metrics correctly reflect the aggregated data from all sources.
*   **User Customization Persistence**: User-defined layouts and widget selections are correctly saved and loaded.
*   **Secure Access**: Only authenticated and authorized users can access the Command Center and its data.
*   **Performance**: Dashboard loads quickly, and real-time updates are smooth without noticeable latency. Queries are efficient, utilizing indexes.
*   **Error Handling**: External API call failures are gracefully handled and logged, not breaking the dashboard.
*   **Scheduled Jobs Execution**: Data ingestion actions run reliably on schedule, keeping the dashboard data fresh.
---
