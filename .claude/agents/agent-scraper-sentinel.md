---
name: agent-convex-scraper-sentinel
description: Implements an internal Scraper Sentinel monitoring dashboard using Convex actions, mutations, and queries with Clerk authentication.
model: inherit
color: purple
---


# Agent: Scraper Sentinel Implementation with Convex

## Agent Overview
**Purpose**: This agent instruction details how to build an internal "Scraper Sentinel" monitoring dashboard within a Next.js application, leveraging Convex for backend logic, data storage, and real-time updates, and Clerk for authentication. The Scraper Sentinel will monitor local `crawl_history` and `selectors` tables, display health metrics (error rates, success rates, failed crawls, queue status), and provide capabilities for triggering retries and monitoring updates.
**Tech Stack**: Next.js, Convex, Clerk, TypeScript
**Source**: Convex Developer Hub (various guides on actions, mutations, queries, authentication, and best practices), Clerk documentation.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
Convex continuously evolves, but key architectural principles for backend logic remain consistent. Recent updates focus on performance, developer experience, and expanded capabilities (e.g., vector search). For external API calls and complex logic, Convex **Actions** are the designated mechanism, allowing interaction with the outside world (e.g., calling a custom script on a VPS, interacting with Redis). Convex also offers **HTTP Actions** for creating public HTTP endpoints, which are useful for webhooks (e.g., from Clerk for user sync) but should be kept minimal and delegate complex logic to regular actions.

### 2. Common Pitfalls & Solutions 🚨
*   **Misusing Queries/Mutations for Side Effects**: A common mistake is attempting external API calls or non-deterministic logic within Convex queries or mutations. This will fail, as queries and mutations are designed to be pure and deterministic for reactivity and transactional guarantees.
    *   **Solution**: Always encapsulate external API calls, non-deterministic logic, or long-running tasks within **Convex Actions**. Actions can then call mutations to update the database based on their results.
*   **Excessive `ctx.runAction` calls**: Calling `ctx.runAction` too frequently from another action can lead to performance overhead due to crossing JavaScript runtimes and allocating extra resources.
    *   **Solution**: If an action needs to call logic in the same runtime, refactor the common code into a shared TypeScript helper function. If different runtimes are required, consider batching calls or optimizing the workflow to minimize redundant action calls.
*   **Ignoring Authentication/Authorization**: Exposing monitoring data without proper access control.
    *   **Solution**: Implement robust authorization checks within Convex queries, mutations, and actions using `ctx.auth` to verify the authenticated user (via Clerk) and their permissions before allowing data access or modifications.
*   **Complex Logic in HTTP Actions**: Placing heavy business logic directly within HTTP actions.
    *   **Solution**: Keep HTTP actions lean. They should primarily validate input, transform it, and then delegate the core business logic to a regular Convex action or mutation. This keeps the HTTP layer focused on request/response handling.

### 3. Best Practices 🚨
*   **Small, Focused Actions**: Keep Convex actions as small and focused as possible, primarily handling the non-deterministic parts (e.g., `fetch` calls, external service interactions). They should then trigger mutations to persist data to the Convex database.
*   **End-to-End Type Safety**: Leverage Convex's end-to-end type safety. Define your database schema clearly in `convex/schema.ts` to ensure consistency between your backend functions and frontend usage.
*   **Real-time with Queries**: Utilize Convex queries for all data reads that need real-time updates on the dashboard. Convex automatically pushes updates to subscribed clients when underlying data changes, eliminating the need for manual WebSocket management.
*   **Transactional Mutations**: Use mutations for all database writes. They are atomic and transactional, guaranteeing data integrity.
*   **Secure Environment Variables**: Store sensitive information like API keys (for VPS interaction, Redis, etc.) as Convex environment variables (e.g., `npx convex env set MY_API_KEY "sk_..."`). Access these securely within your Convex functions via `process.env`.
*   **Clerk JWT Templates**: Configure a JWT template in Clerk specifically for Convex. This allows Convex to verify user sessions and claims securely.
*   **Clerk Webhooks for User Sync**: Use Clerk webhooks (e.g., `user.created`, `user.updated`, `user.deleted`) to trigger Convex HTTP actions or internal actions that synchronize user data with your Convex `users` table. This ensures your backend has an up-to-date record of users and can manage user-specific data and permissions.

## Implementation Steps
1.  **Convex Project Setup**: Initialize a Convex project and link it to your Next.js application.
2.  **Clerk Integration**: Integrate Clerk for authentication in your Next.js frontend and configure JWT templates and webhooks in the Clerk dashboard to work with Convex.
3.  **Convex Schema Definition**: Define the database schema for `crawl_history`, `selectors`, and `users` tables in `convex/schema.ts`.
4.  **Backend Logic (Convex Functions)**: Implement Convex queries for reading monitoring data, mutations for updating data, and actions for complex logic and external interactions (e.g., triggering a scraper retry, fetching VPS metrics).
5.  **Frontend Integration**: Build the Next.js dashboard components to consume data from Convex queries and trigger mutations/actions using the `@convex-dev/react` hooks.

### Backend Implementation
The backend will be entirely powered by Convex functions, adhering to the following patterns:

#### Convex Functions (Primary)

*   **`convex/users.ts` (Mutations & Queries)**:
    *   `createUser`: A mutation to create a new user entry in Convex when a user signs up via Clerk (triggered by Clerk webhook).
    *   `updateUser`: A mutation to update user details.
    *   `deleteUser`: A mutation to delete user data, potentially triggered by a Clerk webhook.
    *   `getCurrentUser`: A query to fetch the authenticated user's details for authorization checks.
*   **`convex/crawlHistory.ts` (Mutations & Queries)**:
    *   `addCrawlRecord`: A mutation to add new crawl history entries (e.g., from a scraper run).
    *   `updateCrawlRecordStatus`: A mutation to update the status of a crawl (success, failed, retrying).
    *   `getCrawlHistory`: A query to fetch a paginated or filtered list of crawl records for the dashboard.
    *   `getCrawlStats`: A query to aggregate data for error rates, success rates, etc. (e.g., error rate by platform).
*   **`convex/selectors.ts` (Mutations & Queries)**:
    *   `addSelectorVersion`: A mutation to record new selector versions.
    *   `updateSelectorHealth`: A mutation to update a selector's health status (e.g., based on crawl results).
    *   `getSelectorHealth`: A query to retrieve the health status of all selectors.
    *   `getSelectorPerformance`: A query to get success rates per selector version.
*   **`convex/scraperActions.ts` (Actions)**:
    *   `triggerScraperRetry`: An action to initiate a retry for failed crawls. This might involve an external `fetch` call to a VPS endpoint or publishing to a Redis queue.
    *   `fetchVPSMetrics`: An action to fetch resource utilization metrics (CPU, memory) from the VPS running Docker/Chromium. This would involve an external API call.
    *   `getQueueStatus`: An action to query the status of the Redis queue (e.g., pending tasks, active tasks). This would involve an external Redis client integration (using the Node.js runtime for the action).
    *   `applySelfHealingUpdate`: An action to trigger a self-healing update process for selectors, potentially involving external logic or an external script.
*   **`convex/http.ts` (HTTP Actions)**:
    *   `clerkWebhook`: An HTTP action endpoint to receive webhooks from Clerk for user lifecycle events, which then calls an internal mutation (e.g., `api.users.createUser`) to sync user data.

### Frontend Integration
The Next.js frontend will utilize the `@convex-dev/react` package to interact with the Convex backend:
*   Use `useQuery` hooks to subscribe to `api.crawlHistory.getCrawlHistory`, `api.selectors.getSelectorHealth`, `api.crawlHistory.getCrawlStats`, etc., for real-time display on the dashboard.
*   Use `useMutation` hooks to call `api.crawlHistory.updateCrawlRecordStatus` or `api.selectors.updateSelectorHealth` for direct state changes (if applicable).
*   Use `useAction` hooks to trigger `api.scraperActions.triggerScraperRetry`, `api.scraperActions.fetchVPSMetrics`, `api.scraperActions.getQueueStatus`, etc., for more complex operations or external interactions.
*   Implement `ClerkProvider` and `ConvexProviderWithClerk` for seamless authentication and context sharing across the application.

## Code Patterns

### Convex Backend Functions
*   **Schema Definition (`convex/schema.ts`)**:

    ```typescript
    import { defineSchema, defineTable } from "convex/schema";
    import { v } from "convex/values";

    export default defineSchema({
      users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        role: v.optional(v.string()), // e.g., "admin", "viewer"
      }).index("by_clerk_id", ["clerkId"]),
      crawl_history: defineTable({
        platform: v.string(),
        selectorVersionId: v.id("selectors"), // Reference to the active selector version
        url: v.string(),
        status: v.string(), // e.union(v.literal("success"), v.literal("failed"), v.literal("retried")),
        errorMessage: v.optional(v.string()),
        crawlTime: v.number(), // Timestamp
        dataExtracted: v.optional(v.string()), // Or v.object for structured data
        retries: v.number(),
      }).index("by_platform_status", ["platform", "status"])
        .index("by_selector_version", ["selectorVersionId"])
        .index("by_crawl_time", ["crawlTime"]),
      selectors: defineTable({
        name: v.string(),
        version: v.string(),
        definition: v.string(), // e.g., JSON string or actual selector definitions
        isActive: v.boolean(),
        healthStatus: v.string(), // e.g., "healthy", "degraded", "critical"
        lastChecked: v.number(),
        successRate: v.number(), // Percentage
        errorCount: v.number(),
        totalCrawls: v.number(),
      }).index("by_name_version", ["name", "version"])
        .index("by_isActive", ["isActive"]),
    });
    ```
*   **Example Query (`convex/crawlHistory.ts`)**: To get recent failed crawls.

    ```typescript
    import { query } from "./_generated/server";
    import { v } from "convex/values";

    export const getRecentFailedCrawls = query({
      args: {
        platform: v.optional(v.string()),
        limit: v.number(),
      },
      handler: async (ctx, { platform, limit }) => {
        // Auth check (example: only admins can view all failed crawls)
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        // Example: Further check user role from your `users` table
        // const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
        // if (user?.role !== "admin") {
        //   throw new Error("Unauthorized");
        // }

        let q = ctx.db.query("crawl_history").withIndex("by_platform_status", (q) =>
          q.eq("status", "failed")
        );

        if (platform) {
          q = q.eq("platform", platform);
        }

        return await q.order("desc").take(limit);
      },
    });
    ```
*   **Example Action (`convex/scraperActions.ts`)**: To trigger a scraper retry.

    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";

    export const triggerScraperRetry = action({
      args: {
        crawlRecordId: v.id("crawl_history"),
        // Potentially more args like specific retry config
      },
      handler: async (ctx, { crawlRecordId }) => {
        // Auth check here, as actions can also be exposed
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Not authenticated");
        }
        // Optionally fetch user role from Convex db to authorize
        // const user = await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject)).unique();
        // if (user?.role !== "admin") {
        //   throw new Error("Unauthorized to trigger retries");
        // }

        // Fetch the failed crawl record
        const crawlRecord = await ctx.runQuery(api.crawlHistory.getCrawlRecordById, { id: crawlRecordId });
        if (!crawlRecord || crawlRecord.status !== "failed") {
          throw new Error("Crawl record not found or not in 'failed' state.");
        }

        // --- External API call example ---
        const scraperApiUrl = process.env.SCRAPER_MANAGER_API_URL;
        if (!scraperApiUrl) {
          throw new Error("Scraper manager API URL not configured.");
        }

        try {
          const response = await fetch(`${scraperApiUrl}/retry-crawl`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.SCRAPER_MANAGER_API_KEY}`,
            },
            body: JSON.stringify({
              url: crawlRecord.url,
              platform: crawlRecord.platform,
              // Pass any necessary context for the retry
            }),
          });

          if (!response.ok) {
            throw new Error(`External scraper API failed: ${response.statusText}`);
          }

          const result = await response.json();
          console.log("Scraper retry triggered:", result);

          // Update Convex database via a mutation
          await ctx.runMutation(api.crawlHistory.updateCrawlRecordStatus, {
            id: crawlRecordId,
            status: "retrying",
            retries: (crawlRecord.retries || 0) + 1,
            // Clear error message if retrying
            errorMessage: undefined,
          });

          return { success: true, message: "Scraper retry initiated." };
        } catch (error) {
          console.error("Failed to trigger scraper retry:", error);
          // Log failure to database
          await ctx.runMutation(api.crawlHistory.updateCrawlRecordStatus, {
            id: crawlRecordId,
            status: "failed", // Still failed, but maybe indicate retry attempt
            errorMessage: `Retry attempt failed: ${error.message}`,
          });
          throw new Error(`Failed to initiate scraper retry: ${error.message}`);
        }
      },
    });
    ```
*   **Clerk Webhook Handler (`convex/http.ts`)**:

    ```typescript
    import { httpRouter } from "convex/server";
    import { httpAction } from "./_generated/server";
    import { WebhookEvent } from "@clerk/nextjs/server";
    import { internal } from "./_generated/api"; // Access internal functions

    const http = httpRouter();

    http.route({
      path: "/clerk-webhook",
      method: "POST",
      handler: httpAction(async (ctx, request) => {
        const payload = await request.json() as WebhookEvent;
        const headers = request.headers;

        // CRITICAL: Validate the webhook signature
        // In a real app, use Clerk's `verifyWebhook` method
        // For simplicity, this example omits full validation, but it's essential!
        // const svix_id = headers.get("svix-id")!;
        // const svix_timestamp = headers.get("svix-timestamp")!;
        // const svix_signature = headers.get("svix-signature")!;
        // const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        // const wh = new Webhook(webhookSecret);
        // const evt = wh.verify(JSON.stringify(payload), {
        //   "svix-id": svix_id,
        //   "svix-timestamp": svix_timestamp,
        //   "svix-signature": svix_signature,
        // }) as WebhookEvent;

        switch (payload.type) {
          case "user.created":
            await ctx.runMutation(internal.users.createClerkUser, {
              clerkId: payload.data.id,
              email: payload.data.email_addresses[0]?.email_address || "",
              name: `${payload.data.first_name || ""} ${payload.data.last_name || ""}`.trim(),
              // Default role or other metadata
              role: "viewer",
            });
            break;
          case "user.updated":
            await ctx.runMutation(internal.users.updateClerkUser, {
              clerkId: payload.data.id,
              email: payload.data.email_addresses[0]?.email_address || "",
              name: `${payload.data.first_name || ""} ${payload.data.last_name || ""}`.trim(),
            });
            break;
          case "user.deleted":
            await ctx.runMutation(internal.users.deleteClerkUser, {
              clerkId: payload.data.id,
            });
            break;
          default:
            console.log(`Unhandled Clerk webhook event type: ${payload.type}`);
        }

        return new Response(null, { status: 200 });
      }),
    });

    export default http;
    ```
    *Note: `internal.users.createClerkUser` would be an `internalMutation` to be called only by other Convex functions (like the webhook handler), not directly by the client. This mutation would handle the database write.*

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard to inspect database tables, view function logs, and monitor function execution. This is invaluable for debugging queries, mutations, and actions.
*   **Local Development**: Run `npx convex dev` to get real-time type checking and a local development server for Convex.
*   **Convex Inspect**: Use `npx convex inspect` to interact with your Convex functions from the command line, allowing you to test specific queries, mutations, or actions with arguments.
*   **Clerk Webhook Testing**: Use Clerk's webhook testing tools (e.g., localtunnel or ngrok if developing locally, or the Clerk dashboard's "Test webhook" feature) to ensure your `clerk-webhook` HTTP action is correctly receiving and processing events.
*   **Action Error Handling**: Thoroughly test error handling within actions, especially for external API calls. Ensure your actions gracefully handle network issues, API rate limits, and unexpected responses, and update the database accordingly (e.g., mark a crawl as `failed` with an `errorMessage`).

## Environment Variables
The following environment variables are required:

```dotenv
# Convex Deployment URL
NEXT_PUBLIC_CONVEX_URL=https://<your-convex-deployment-name>.convex.site

# Clerk Public Key for Next.js Frontend
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Clerk Secret Key for backend (e.g., for verifying webhooks if not using an HTTP action)
CLERK_SECRET_KEY=sk_live_...

# Clerk JWT Issuer URL (from Clerk dashboard -> JWT Templates -> Convex -> Advanced)
CLERK_JWT_ISSUER_DOMAIN=https://clerk.<your-project-id>.clerk.accounts.dev

# Clerk Webhook Secret (for verifying incoming webhooks from Clerk)
CLERK_WEBHOOK_SECRET=whsec_...

# Scraper Manager API URL (for triggering retries, fetching VPS metrics)
SCRAPER_MANAGER_API_URL=https://api.your-scraper-manager.com

# Scraper Manager API Key (for authenticating with your scraper's external API)
SCRAPER_MANAGER_API_KEY=your_scraper_api_key_here

# (Optional) Redis connection string for queue status
REDIS_URL=redis://localhost:6379
```

Set these environment variables in your Convex deployment using `npx convex env set <VAR_NAME> <VALUE>` and in your local `.env.local` file for Next.js.

## Success Metrics
*   **Real-time Dashboard Updates**: The Scraper Sentinel dashboard updates instantly when new crawl records are added or statuses change.
*   **Accurate Data Display**: Error rates, success rates, selector health, and queue statuses are accurately reflected from Convex data.
*   **Secure Access**: Only authenticated and authorized users (e.g., "admin" role) can view sensitive monitoring data and trigger actions like retries.
*   **Functional Actions**: Triggering a scraper retry successfully initiates the external process and updates the `crawl_history` status in Convex.
*   **Robust External Integrations**: External API calls (to scraper manager, VPS monitoring) from Convex actions are stable, handle errors, and return expected data.
*   **Clerk User Sync**: New Clerk users are automatically created in Convex, and updates/deletions are synchronized via webhooks.
*   **Type Safety**: The entire application compiles without TypeScript errors, ensuring end-to-end type safety.
*   **Performance**: Queries load data efficiently, and actions execute without significant latency, indicating adherence to Convex best practices for function calls.