---
name: agent-custom-socialsentinel
description: Implements Social Sentinel feature using a custom API and Convex backend.
model: inherit
color: purple
---


# Agent: Social Sentinel Implementation with Custom API

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for integrating a "Custom API" (which encapsulates the Social Sentinel Instagram/TikTok performance monitoring and self-healing logic) with a Next.js frontend, Convex backend, and Clerk authentication. It focuses on leveraging Convex actions, mutations, and queries for robust, scalable, and real-time data management.
**Tech Stack**: Next.js, React, Convex, Clerk, Custom API (Playwright, Docker, Redis on VPS)
**Source**: This guide synthesizes best practices for Convex and general API integration, informed by the detailed "Social Sentinel" feature description, as no public documentation for a "Custom API" exists.

## Critical Implementation Knowledge
The "Custom API" for Social Sentinel is an internal service designed to handle the complex, resource-intensive, and platform-specific logic of scraping Instagram and TikTok. Its interaction with Convex will define the system's architecture.

### 1. Custom API Latest Updates 🚨
As a "Custom API", there are no external public updates or deprecations. It is crucial to maintain a clear internal API specification and versioning. Key considerations:
*   **Version Control**: Implement strict API versioning (e.g., `/api/v1/profiles`) to manage changes.
*   **Documentation**: Internally document all endpoints, request/response payloads, and error codes thoroughly for developers integrating with it.
*   **Breaking Changes**: Any changes to the Custom API's endpoints or data models that affect Convex integration must be communicated and coordinated carefully.

### 2. Common Pitfalls & Solutions 🚨
*   **Pitfall**: Exposing Custom API keys or sensitive data in client-side code.
    *   **Solution**: All calls to the Custom API *must* originate from Convex actions (backend), never directly from the frontend. Store Custom API keys securely as Convex environment variables.
*   **Pitfall**: Blocking frontend UI during long-running Custom API operations (e.g., initiating a new profile crawl).
    *   **Solution**: Custom API calls should be asynchronous. Convex actions are ideal for this, running server-side without blocking the client. The client can poll Convex queries for status updates or rely on Convex's real-time updates for data written by the Custom API.
*   **Pitfall**: Inconsistent data between Convex and the Custom API due to failures.
    *   **Solution**: Implement idempotent operations where possible. Use transactions (if supported by Custom API) or a saga pattern for multi-step processes. The Custom API pushing data to Convex (via mutations) is generally more resilient than Convex pulling, as the Custom API is the source of truth for scraped data.
*   **Pitfall**: Handling rate limits from the Custom API (if any) or Instagram/TikTok itself.
    *   **Solution**: The Custom API description states it handles internal rate limiting, circuit breakers, and retries with backoff. Convex actions calling the Custom API should also implement retries with exponential backoff for transient Custom API errors.

### 3. Best Practices 🚨
*   **Convex Actions for External API Calls**: Always use Convex actions (`convex/socialSentinel.ts` or similar) to make HTTP requests to the Custom API. This keeps sensitive API keys secure and allows for complex server-side logic, error handling, and retries.
*   **Convex Mutations for State Changes**: The Custom API service itself should be designed to call Convex mutations directly to persist scraped data (profiles, posts, metrics, crawl history, selectors). This ensures data consistency and leverages Convex's transactional guarantees and real-time updates.
*   **Convex Queries for Real-time Data**: Use Convex queries for all data reads. The dashboard and profile management UI will benefit from Convex's real-time subscriptions, automatically updating when the Custom API pushes new data via mutations.
*   **Authentication & Authorization**:
    *   **Convex to Custom API**: Use an API key/token stored in Convex environment variables.
    *   **Custom API to Convex**: The Custom API service needs its own Convex API key with mutation permissions to write data.
    *   **Frontend to Convex (Clerk)**: Leverage Clerk integration for user authentication and pass user identity (e.g., `auth.userId`) through Convex actions/mutations to scope data access and ownership.
*   **Idempotency**: Design Custom API endpoints and Convex functions to be idempotent where possible (e.g., adding a profile, updating metrics) to prevent unintended side effects on retries.

## Implementation Steps

### Backend Implementation (Convex & Custom API)

1.  **Define Custom API Endpoints**: Based on the Social Sentinel features, define the Custom API's RESTful endpoints (e.g., for adding/managing profiles, initiating specific crawls).
    *   Example:
        *   `POST /profiles`: Add a new profile for monitoring.
        *   `PUT /profiles/{profileId}/pause`: Pause monitoring.
        *   `PUT /profiles/{profileId}/resume`: Resume monitoring.
        *   `POST /profiles/{profileId}/retry`: Retry monitoring.
        *   `GET /status`: Custom API service health check.
2.  **Define Custom API -> Convex Data Push Mechanism**: The Custom API service, after scraping, will make authenticated HTTP requests to *Convex mutation endpoints* to persist data.
    *   Example: The Custom API would call `POST https://<your-convex-deployment-url>/api/mutate?function=socialSentinel:addProfileData` (or a dedicated webhook-like Convex endpoint) with the scraped data.
3.  **Implement Convex `api` functions**:
    *   **Actions**: To interact *with* the Custom API (triggering operations).
    *   **Mutations**: To store data *from* the Custom API and manage Convex-internal state (e.g., linking Clerk users to profiles).
    *   **Queries**: To fetch data for the frontend.

#### Convex Functions (Primary)

*   **`socialSentinel.ts` (or similar file in `convex/`):**
    *   **Actions:**
        *   `addProfile`: Receives `profileUrl` (Instagram/TikTok), `userId` (from Clerk `auth.userId`). Calls Custom API `POST /profiles` to register the profile. If successful, calls `saveProfileRecord` mutation. Handles Custom API errors and retries.
        *   `pauseMonitoring`: Receives `profileId` (Convex ID). Calls Custom API `PUT /profiles/{profileId}/pause`. Updates profile status in Convex via mutation.
        *   `resumeMonitoring`: Receives `profileId` (Convex ID). Calls Custom API `PUT /profiles/{profileId}/resume`. Updates profile status in Convex via mutation.
        *   `retryMonitoring`: Receives `profileId` (Convex ID). Calls Custom API `POST /profiles/{profileId}/retry`.
        *   `syncStatus`: (Optional) Periodically calls Custom API `GET /profiles/{profileId}/status` to get real-time status if Custom API doesn't push status updates.
    *   **Mutations:**
        *   `saveProfileRecord`: Stores initial profile data in Convex (e.g., `_id`, `clerkUserId`, `platform`, `profileHandle`, `customApiProfileId`, `status: 'monitoring'`).
        *   `updateProfileData`: Called *by the Custom API* (or Convex action) to update profile details (name, picture, bio, followers).
        *   `addPostData`: Called *by the Custom API* to add or update post details (URL, caption, hashtags, date, thumbnail, metrics).
        *   `addPerformanceMetric`: Called *by the Custom API* to store historical performance metrics (views, likes, comments, shares).
        *   `updateSelectors`: Called *by the Custom API* to record self-healing selector updates.
        *   `addCrawlHistoryEntry`: Called *by the Custom API* to log crawl attempts and their outcomes.
        *   `deleteProfile`: Removes a profile and associated data.
    *   **Queries:**
        *   `getProfilesByUser`: Fetches all monitored profiles for the authenticated Clerk user.
        *   `getProfileDetails`: Fetches a single profile and its latest data.
        *   `getPostsForProfile`: Retrieves all posts for a given profile.
        *   `getPerformanceMetricsForProfile`: Fetches historical performance metrics.
        *   `getDashboardStats`: Aggregated query for overall system health, errors, costs, and VPS status (from `crawl_history`, `performance_metrics` tables).

### Frontend Integration (Next.js)

1.  **Dashboard Components**: Use `useQuery` from `convex/react` to subscribe to `getDashboardStats`, `getProfilesByUser`, and `getErrors`. This will provide real-time updates.
2.  **Profile Management UI**:
    *   **Add Profile Form**: On submission, call `useMutation(api.socialSentinel.addProfile)`.
    *   **Profile List**: Display profiles from `getProfilesByUser`. For each profile, buttons (Pause, Resume, Retry, Delete) will call corresponding `useMutation` hooks (`api.socialSentinel.pauseMonitoring`, etc.).
3.  **Data Visualization**: Render charts and tables using data from `getPostsForProfile` and `getPerformanceMetricsForProfile`.

## Code Patterns

### Convex Backend Functions

*   **Calling Custom API (Action Example):**
    ```typescript
    // convex/socialSentinel.ts
    import { mutation, action, query } from './_generated/server';
    import { v } from 'convex/values';
    import { internal } from './_generated/api';

    // Convex Action to add a new profile via the Custom API
    export const addProfile = action({
      args: {
        profileUrl: v.string(),
        platform: v.string(), // e.g., "instagram", "tiktok"
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Unauthenticated call to addProfile");
        }
        const clerkUserId = identity.subject;

        const customApiUrl = process.env.CUSTOM_API_BASE_URL;
        const customApiKey = process.env.CUSTOM_API_KEY;

        if (!customApiUrl || !customApiKey) {
          throw new Error("Missing CUSTOM_API_BASE_URL or CUSTOM_API_KEY environment variables");
        }

        try {
          const response = await fetch(`${customApiUrl}/profiles`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${customApiKey}`,
            },
            body: JSON.stringify({
              url: args.profileUrl,
              platform: args.platform,
              // Optionally pass Convex user ID to Custom API for tracking
              externalUserId: clerkUserId,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Custom API Error: ${response.status} - ${errorText}`);
          }

          const customApiResult = await response.json();
          // After successfully calling Custom API, save a record in Convex
          await ctx.runMutation(internal.socialSentinel.saveProfileRecord, {
            clerkUserId,
            platform: args.platform,
            profileHandle: customApiResult.handle || new URL(args.profileUrl).pathname.split('/').filter(Boolean).pop(), // Infer handle
            customApiProfileId: customApiResult.id, // Store Custom API's internal ID
            status: 'monitoring',
            lastUpdated: Date.now(),
          });

          return customApiResult;
        } catch (error) {
          console.error("Failed to add profile to Custom API:", error);
          throw new Error(`Failed to initiate monitoring: ${error.message}`);
        }
      },
    });

    // Convex Mutation called by the action above
    export const saveProfileRecord = mutation({
      args: {
        clerkUserId: v.string(),
        platform: v.string(),
        profileHandle: v.string(),
        customApiProfileId: v.string(),
        status: v.string(),
        lastUpdated: v.number(),
      },
      handler: async (ctx, args) => {
        return await ctx.db.insert('profiles', args);
      },
    });

    // Convex Mutation called BY THE CUSTOM API to update data
    // This mutation would need to be exposed as a public endpoint or use a Convex API key for authentication
    // For direct calls from a custom service, use `internal` or a separate `api.ts` file with specific permissions.
    // Example: A separate webhook handler or dedicated API key for this mutation.
    export const addPostData = mutation({
      args: {
        customApiProfileId: v.string(),
        postUrl: v.string(),
        caption: v.string(),
        hashtags: v.array(v.string()),
        date: v.string(),
        thumbnailUrl: v.string(),
        views: v.optional(v.number()),
        likes: v.optional(v.number()),
        comments: v.optional(v.number()),
        shares: v.optional(v.number()),
        tiktokVideoUrl: v.optional(v.string()), // Specific to TikTok
        scrapedAt: v.number(),
      },
      handler: async (ctx, args) => {
        // Find the profile based on customApiProfileId
        const profile = await ctx.db
          .query('profiles')
          .withIndex('by_customApiProfileId', (q) =>
            q.eq('customApiProfileId', args.customApiProfileId)
          )
          .first();

        if (!profile) {
          throw new Error(`Profile not found for Custom API ID: ${args.customApiProfileId}`);
        }

        // Insert or update post data
        // For simplicity, this example just inserts. A real app might check for existing posts and update metrics.
        return await ctx.db.insert('posts', {
          profileId: profile._id,
          ...args,
        });
      },
    });

    // Convex Query to fetch data for the frontend
    export const getProfilesByUser = query({
      handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          return [];
        }
        const clerkUserId = identity.subject;

        return await ctx.db
          .query('profiles')
          .withIndex('by_clerkUserId', (q) =>
            q.eq('clerkUserId', clerkUserId)
          )
          .collect();
      },
    });
    ```

## Testing & Debugging

1.  **Convex Actions**:
    *   Use Convex's local development environment (`npx convex dev`) to test actions.
    *   Use `console.log` statements within actions to inspect `fetch` requests, responses, and error handling.
    *   Simulate Custom API responses (e.g., success, 4xx, 5xx) to test error paths in your Convex actions.
2.  **Convex Mutations**:
    *   Verify data is correctly written to your Convex database using the Convex dashboard or `npx convex dev` with the browser dev tools.
    *   Test mutations called *by the Custom API* by manually sending POST requests to your Convex deployment's mutation endpoint (e.g., using `curl` or Postman) to simulate the Custom API's behavior. Ensure proper authentication.
3.  **Convex Queries**:
    *   Test queries in isolation to ensure they return the expected data shape and honor authentication/authorization.
    *   Verify real-time updates in the frontend by making changes via actions/mutations and observing the UI.
4.  **Custom API Health Checks**: Ensure the Custom API has its own health check endpoints that Convex can ping (via an action) to monitor its availability.
5.  **Logging**: Implement comprehensive logging in both the Custom API service and Convex actions/mutations to trace data flow and debug issues.

## Environment Variables

*   `.env.local` (for Next.js and Convex CLI):
    ```
    NEXT_PUBLIC_CONVEX_URL="YOUR_CONVEX_DEPLOYMENT_URL"
    CLERK_SECRET_KEY="sk_YOUR_CLERK_SECRET_KEY"
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_YOUR_CLERK_PUBLISHABLE_KEY"
    ```
*   Convex Deployment Environment Variables (set via `npx convex env set`):
    ```
    CUSTOM_API_BASE_URL="https://your-custom-api-domain.com/api/v1"
    CUSTOM_API_KEY="your_secure_custom_api_key_for_convex_to_call_custom_api"
    CONVEX_API_KEY_FOR_CUSTOM_API="your_secure_convex_api_key_for_custom_api_to_call_convex"
    ```
    *   **CRITICAL**: `CONVEX_API_KEY_FOR_CUSTOM_API` needs to be generated in your Convex dashboard with `write` permissions to the specific mutations the Custom API will call (e.g., `socialSentinel:addPostData`).

## Success Metrics

*   **Profiles Management**:
    *   ✅ Users can successfully add new Instagram/TikTok profiles for monitoring.
    *   ✅ Users can pause, resume, and retry monitoring for profiles.
    *   ✅ Profile status (monitoring, paused, error) is accurately reflected in the dashboard.
*   **Data Extraction & Display**:
    *   ✅ Latest profile data (username, followers, etc.) is extracted and displayed correctly.
    *   ✅ Latest 30 posts with their metrics (views, likes, comments, shares) are extracted and displayed.
    *   ✅ Data updates in the dashboard within 10-20 seconds of the Custom API completing a crawl.
    *   ✅ Real-time updates of dashboard statistics and profile data are visible without page refresh.
*   **Self-Healing & Robustness**:
    *   ✅ System automatically detects and adapts to CSS selector changes.
    *   ✅ Crawl failures are logged and visible in the dashboard.
    *   ✅ Custom API's internal retry mechanisms (3x with backoff) are functioning.
*   **Convex Integration**:
    *   ✅ All backend logic for external API calls uses Convex Actions.
    *   ✅ All database writes are performed via Convex Mutations (either by Convex actions or directly by Custom API).
    *   ✅ All frontend data reads utilize Convex Queries for real-time subscriptions.
    *   ✅ Sensitive API keys are securely stored in Convex environment variables.
    *   ✅ Clerk authentication is correctly integrated to scope user data.
*   **Scalability**:
    *   ✅ System can handle 1000+ profiles/day monitoring.
*   **Cost Monitoring**:
    *   ✅ Dashboard accurately displays estimated monitoring costs.