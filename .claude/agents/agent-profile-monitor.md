---
name: agent-Convex-ProfileMonitor
description: Implements a Profile Monitor feature using Convex, integrating with a custom VPS API and R2 storage.
model: inherit
color: purple
---


# Agent: Profile Monitor Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a "Profile Monitor" feature. This involves setting up a Convex backend with a database schema for profiles, posts, metrics, selectors, and crawl history, along with CRUD operations, real-time queries, row-level security, and a scheduler. Critically, it details how Convex actions integrate with an external "VPS API" for crawling and Cloudflare R2 for screenshot storage.
**Tech Stack**: Next.js, Convex (Database, Actions, Mutations, Queries, Scheduler, Authentication), Clerk (Authentication), Cloudflare R2 (File Storage).
**Source**: Convex Developer Hub documentation, Stack by Convex articles, GitHub Gists, YouTube tutorials.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
*   **New Function Syntax**: Always use the modern function syntax for Convex functions (`query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`).
*   **Argument & Return Validators**: Mandatory for all Convex functions using `v` from `convex/values`. This ensures type safety and robust API contracts.
*   **Action Context (`ctx`)**: The `ctx` object in actions provides access to `runQuery`, `runMutation`, `storage`, `auth`, and `scheduler`.
*   **File Storage**: Convex offers built-in file storage. For Cloudflare R2, use the `@convex-dev/r2` component for easy integration, especially if CDN delivery and free egress are crucial.

### 2. Common Pitfalls & Solutions 🚨
*   **External Calls in Queries/Mutations**:
    *   **Pitfall**: Attempting `fetch` or other non-deterministic operations directly within Convex `query` or `mutation` functions. This breaks Convex's transactional guarantees and reactivity.
    *   **Solution**: Always use `action` functions for external API calls, complex business logic, or third-party integrations. Actions are the "escape hatch" for such operations.
*   **Overuse of `ctx.runAction` from another Action**:
    *   **Pitfall**: Calling `await ctx.runAction` from one action to another within the same runtime incurs overhead.
    *   **Solution**: Refactor shared logic into a TypeScript helper function and call the helper directly to avoid unnecessary function call overhead, unless explicitly needing to cross runtimes (e.g., V8 to Node.js).
*   **Inconsistent Database Reads/Writes in Actions**:
    *   **Pitfall**: Multiple `ctx.runQuery` or `ctx.runMutation` calls within an action can lead to inconsistent data if they run in separate transactions.
    *   **Solution**: Batch database access by consolidating reads/writes into single (internal) mutations or queries where possible to maintain transactional consistency.
*   **Missing Access Control**:
    *   **Pitfall**: Public Convex functions (`query`, `mutation`, `action`) without proper access control can expose sensitive data or operations.
    *   **Solution**: Implement robust access control for all public functions by checking `ctx.auth.getUserIdentity()` or applying row-level security.

### 3. Best Practices 🚨
*   **Convex Actions for External API Interaction**: Use `action` functions for all calls to the external "VPS API" and Cloudflare R2.
*   **Transactional Scheduling**: When an action needs to be triggered conditionally based on a database state change, use `ctx.scheduler.runAfter(0, internal.myAction, args)` within a `mutation`. This ensures the action is only scheduled if the mutation successfully commits.
*   **Row-Level Security (RLS)**: Implement RLS to ensure users only see and modify their own data. This can be done by wrapping `ctx.db` operations with checks based on `ctx.auth.getUserIdentity()`. Consider using `convex-helpers` for RLS.
*   **Internal Functions**: Use `internalAction`, `internalMutation`, `internalQuery` for functions that should only be callable by other Convex functions, not directly by clients.
*   **Schema Design**: Define clear database schemas using `defineTable` and `v` validators, including indexes for frequently queried fields (e.g., `userId`, `status`, `platform`, `timestamp`).
*   **Error Handling**: Implement robust error handling in actions, especially for external API calls, and ensure mutations gracefully handle potential failures.

## Implementation Steps

### Backend Implementation
The Profile Monitor's backend logic will be almost entirely implemented in Convex, leveraging `actions` for external API interactions, `mutations` for database writes, `queries` for data reads, and `cron jobs` for scheduled crawls.

#### Convex Functions (Primary)
1.  **Schema Definition (`convex/schema.ts`)**:
    *   `profiles`: `userId`, `platform`, `identifier` (e.g., Twitter handle), `status` (active, paused, error), `crawlSchedule` (e.g., "every 5 minutes"), `lastCrawled` (timestamp), `nextCrawl` (timestamp).
    *   `posts`: `profileId`, `postId` (external ID), `content`, `videoUrl`, `imageUrl`, `timestamp`.
    *   `performance_metrics`: `profileId`, `timestamp`, `followers` (nullable), `likes` (nullable), `comments` (nullable), `views` (nullable).
    *   `selectors`: `platform`, `version`, `cssSelector` (JSON/string), `successRate`, `lastUpdated`.
    *   `crawl_history`: `profileId`, `timestamp`, `durationMs`, `status` (success, failure), `errorMessage` (nullable), `screenshotUrl` (nullable).
2.  **Authentication (`convex/auth.config.ts`)**: Configure Clerk integration.
3.  **`convex/profiles.ts`**:
    *   `addProfile` (mutation): Inserts a new profile, setting initial `nextCrawl` and `status`. Enforces `userId` based on `ctx.auth`.
    *   `removeProfile` (mutation): Deletes a profile. Enforces `userId`.
    *   `pauseProfile` (mutation): Updates profile status to `paused`. Enforces `userId`.
    *   `resumeProfile` (mutation): Updates profile status to `active`, re-calculating `nextCrawl`. Enforces `userId`.
    *   `getProfilesByUser` (query): Retrieves profiles for the authenticated user, potentially filtering by `status` or `platform`.
    *   `getProfileById` (query): Retrieves a single profile by ID, enforcing `userId`.
4.  **`convex/posts.ts`**:
    *   `storePost` (mutation): Inserts a new post associated with a `profileId`. Enforces `userId` by looking up the profile.
    *   `getPostsByProfile` (query): Retrieves posts for a given `profileId`, enforcing `userId`.
    *   `getPostsByTimeRange` (query): Retrieves posts across profiles for the authenticated user within a time range.
5.  **`convex/performance_metrics.ts`**:
    *   `storeMetric` (mutation): Stores performance metrics for a `profileId`. Enforces `userId`.
    *   `getMetricsByProfile` (query): Retrieves time-series metrics for a given `profileId` and time range, enforcing `userId`.
6.  **`convex/selectors.ts`**:
    *   `updateSelector` (mutation): Updates CSS selectors, potentially triggered by an admin or an automated process.
    *   `getSelectorByPlatform` (query): Retrieves the latest selectors for a platform.
7.  **`convex/crawl_history.ts`**:
    *   `logCrawlAttempt` (mutation): Logs the outcome of a crawl attempt, including errors and duration.
    *   `getCrawlHistoryByProfile` (query): Retrieves crawl logs for a `profileId`, enforcing `userId`.
8.  **`convex/cron.ts`**:
    *   `findProfilesToCrawl` (internalQuery): Finds profiles marked `active` whose `nextCrawl` timestamp is in the past.
    *   `queueCrawlJobs` (internalMutation): Iterates through profiles found by `findProfilesToCrawl`, updates their `nextCrawl` time, and schedules `internal.crawl.performCrawl` for each. This mutation runs as part of the 5-minute cron job.
    *   **Cron Job Definition**: A cron job to run `internal.cron.queueCrawlJobs` every 5 minutes.
9.  **`convex/crawl.ts`**:
    *   `performCrawl` (internalAction):
        *   Takes `profileId` as argument.
        *   Fetches profile details from `profiles` table (via `ctx.runQuery`).
        *   Calls the external "VPS API" (e.g., `fetch('https://your-vps-api.com/crawl', { method: 'POST', body: JSON.stringify(profileDetails) })`). This is where the "Custom API" integration happens.
        *   Handles API response: parses post data, metrics, and potentially a screenshot.
        *   If a screenshot is returned:
            *   Uploads the screenshot to R2 using `@convex-dev/r2`'s `r2.store` method.
            *   Stores the R2 URL in `crawl_history` (via `ctx.runMutation` to `internal.crawl_history.logCrawlAttempt`).
        *   Stores posts and metrics (via `ctx.runMutation` to `internal.posts.storePost` and `internal.performance_metrics.storeMetric`).
        *   Updates `profile` status if errors occur (via `ctx.runMutation`).
        *   Logs the crawl attempt (via `ctx.runMutation` to `internal.crawl_history.logCrawlAttempt`).

### Frontend Integration
1.  **Convex Provider Setup**: Wrap the Next.js app with `ClerkProvider` and `ConvexProviderWithClerk` to establish authentication context.
2.  **Data Fetching**: Use `useQuery` hooks from `convex/react` to display profiles, posts, and metrics in real-time.
3.  **Data Manipulation**: Use `useMutation` hooks for adding, removing, pausing, resuming profiles, or triggering specific actions from the UI (e.g., a manual "Crawl Now" button).
4.  **Authenticated UI**: Conditionally render UI components based on user authentication status using Clerk's `useUser` or `SignedIn`/`SignedOut` components.
5.  **Form Handling**: Implement forms for adding/editing profiles, binding inputs to `useMutation` calls.

## Code Patterns

### Convex Backend Functions
*   **External API Call (Action)**:
    ```typescript
    // convex/crawl.ts
    import { internalAction } from "./_generated/server";
    import { api, internal } from "./_generated/api";
    import { R2 } from "@convex-dev/r2"; // If using Convex R2 component
    import { components } from "./_generated/api"; // For R2 component

    const r2 = new R2(components.r2); // Initialize R2 component

    export const performCrawl = internalAction({
      args: {
        profileId: v.id("profiles"),
      },
      handler: async (ctx, args) => {
        const profile = await ctx.runQuery(internal.profiles.getProfileByIdInternal, { id: args.profileId });
        if (!profile) {
          console.error(`Profile ${args.profileId} not found for crawling.`);
          return;
        }

        try {
          const vpsApiUrl = process.env.VPS_API_URL; // e.g., "https://your-vps-api.com/crawl"
          const response = await fetch(vpsApiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.VPS_API_KEY}`,
            },
            body: JSON.stringify({
              platform: profile.platform,
              identifier: profile.identifier,
              selectors: await ctx.runQuery(internal.selectors.getSelectorByPlatform, { platform: profile.platform }),
            }),
          });

          if (!response.ok) {
            throw new Error(`VPS API error: ${response.statusText}`);
          }

          const crawlData = await response.json();
          let screenshotUrl = null;

          if (crawlData.screenshotBase64) {
            // Convert base64 to Blob, then upload to R2
            const binaryString = atob(crawlData.screenshotBase64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'image/png' });

            // Store directly to R2 from action
            const file = await r2.store(blob); // This stores and returns Convex FileId
            screenshotUrl = await ctx.storage.getUrl(file._id); // Get public URL for the file
          }

          // Store posts, metrics, and crawl history using mutations
          for (const post of crawlData.posts) {
            await ctx.runMutation(internal.posts.storePost, {
              profileId: args.profileId,
              postId: post.id,
              content: post.content,
              videoUrl: post.videoUrl,
              imageUrl: post.imageUrl,
              timestamp: post.timestamp,
            });
          }
          await ctx.runMutation(internal.performance_metrics.storeMetric, {
            profileId: args.profileId,
            timestamp: Date.now(),
            ...crawlData.metrics,
          });

          await ctx.runMutation(internal.crawl_history.logCrawlAttempt, {
            profileId: args.profileId,
            status: "success",
            durationMs: crawlData.duration,
            screenshotUrl: screenshotUrl,
          });

          await ctx.runMutation(internal.profiles.updateProfileStatus, {
            id: args.profileId,
            status: "active", // Reset status to active after successful crawl
          });

        } catch (error: any) {
          console.error(`Crawl failed for profile ${args.profileId}:`, error.message);
          await ctx.runMutation(internal.crawl_history.logCrawlAttempt, {
            profileId: args.profileId,
            status: "failure",
            errorMessage: error.message,
            durationMs: 0, // Or calculate partial duration
            screenshotUrl: null,
          });
          await ctx.runMutation(internal.profiles.updateProfileStatus, {
            id: args.profileId,
            status: "error", // Mark profile with error status
          });
        }
      },
    });
    ```
*   **Scheduling a Crawl (Mutation & Cron)**:
    ```typescript
    // convex/crons.ts
    import { cronJobs } from "convex/server";
    import { internal } from "./_generated/api";

    const crons = cronJobs();

    // Schedule queueCrawlJobs to run every 5 minutes
    crons.interval(
      "queueProfilesForCrawl",
      { minutes: 5 },
      internal.cron.queueCrawlJobs
    );

    export default crons;

    // convex/cron.ts
    import { internalMutation, internalQuery } from "./_generated/server";
    import { v } from "convex/values";
    import { internal } from "./_generated/api";

    export const findProfilesToCrawl = internalQuery({
      args: {},
      handler: async (ctx) => {
        const now = Date.now();
        return await ctx.db
          .query("profiles")
          .withIndex("by_nextCrawl", (q) => q.lt("nextCrawl", now))
          .filter((q) => q.eq(q.field("status"), "active"))
          .collect();
      },
    });

    export const queueCrawlJobs = internalMutation({
      args: {},
      handler: async (ctx) => {
        const profilesToCrawl = await ctx.runQuery(internal.cron.findProfilesToCrawl, {});

        for (const profile of profilesToCrawl) {
          const nextCrawlTime = Date.now() + 5 * 60 * 1000; // Schedule next crawl in 5 minutes
          await ctx.db.patch(profile._id, { nextCrawl: nextCrawlTime });

          // Schedule the actual crawl action immediately (transactionally)
          await ctx.scheduler.runAfter(0, internal.crawl.performCrawl, {
            profileId: profile._id,
          });
        }
      },
    });
    ```
*   **Row-Level Security Example (in a Query)**:
    ```typescript
    // convex/profiles.ts
    import { query } from "./_generated/server";
    import { v } from "convex/values";

    export const getProfilesByUser = query({
      args: {
        status: v.optional(v.string()),
        platform: v.optional(v.string()),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Unauthorized: Not logged in.");
        }
        const userId = identity.subject; // Clerk's user ID

        let q = ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId));

        if (args.status) {
          q = q.filter((r) => r.eq(r.field("status"), args.status));
        }
        if (args.platform) {
          q = q.filter((r) => r.eq(r.field("platform"), args.platform));
        }

        return await q.collect();
      },
    });
    ```

## Testing & Debugging
*   **Convex Dashboard Logs**: Monitor Convex dashboard logs for `action`, `mutation`, and `query` executions, especially for errors from external API calls or RLS violations.
*   **Convex Dashboard Functions Tab**: Test individual Convex functions (`internalAction`, `mutation`, `query`) directly from the dashboard by providing arguments. This is invaluable for debugging backend logic in isolation.
*   **Network Tab**: In your browser's developer tools, observe network requests to Convex endpoints to verify correct data flow and error responses.
*   **VPS API Logging**: Ensure your VPS API has comprehensive logging to debug issues on that side of the integration.
*   **R2 Bucket Inspection**: Verify that screenshots are being uploaded correctly to your Cloudflare R2 bucket.
*   **Clerk Dashboard**: Monitor user sessions and webhook events in the Clerk dashboard.
*   **Transactionality**: Verify that scheduled actions (like `performCrawl`) are only queued if the preceding mutation (`queueCrawlJobs`) successfully commits. Simulate failures to ensure atomicity.

## Environment Variables
*   `CONVEX_DEPLOYMENT_URL`: The URL of your Convex deployment (automatically managed by Convex CLI).
*   `CLERK_PUBLISHABLE_KEY`: Your Clerk frontend publishable key.
*   `CLERK_SECRET_KEY`: Your Clerk backend secret key.
*   `CLERK_JWT_ISSUER_URL`: The JWT issuer URL from your Clerk application.
*   `CLERK_WEBHOOK_SECRET`: Secret for Clerk webhooks (if syncing user data to Convex).
*   `VPS_API_URL`: The base URL for your custom VPS API (e.g., `https://your-vps-api.com`).
*   `VPS_API_KEY`: An API key or token for authenticating requests to your VPS API.
*   `CLOUDFLARE_R2_ACCESS_KEY_ID`: Your Cloudflare R2 Access Key ID.
*   `CLOUDFLARE_R2_SECRET_ACCESS_KEY`: Your Cloudflare R2 Secret Access Key.
*   `CLOUDFLARE_R2_BUCKET`: The name of your R2 bucket.
*   `CLOUDFLARE_R2_ENDPOINT`: Your R2 endpoint (e.g., `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
*   `CLOUDFLARE_R2_PUBLIC_URL_PREFIX`: (Optional) If using a custom domain for R2, the public URL prefix.

## Success Metrics
*   **Profiles CRUD**: Users can add, remove, pause, and resume their own profiles.
*   **Automated Crawling**: The Convex cron job reliably triggers `performCrawl` every 5 minutes for active profiles due for crawling.
*   **VPS API Integration**: The `performCrawl` action successfully calls the external VPS API, retrieves data, and handles responses.
*   **Data Storage**: Posts, performance metrics, and crawl history are accurately stored in the Convex database.
*   **Screenshot Uploads**: Screenshots (if returned by the VPS API) are successfully uploaded to Cloudflare R2 and their URLs are logged in `crawl_history`.
*   **Real-time Queries**: Frontend components display real-time updates for profiles, posts, and metrics using Convex queries.
*   **Row-Level Security**: Users can only access and modify their own profile-related data; attempts to access others' data are correctly blocked.
*   **Error Reporting**: Crawl failures and VPS API errors are logged in `crawl_history` and reflected in profile statuses.