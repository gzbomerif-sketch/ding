The search results indicate that "Custom" is *not* a specific, well-known API for a crawler dashboard. Instead, several web scraping services (Apify, Crawlbase, Bright Data, Scrapfly, ScrapingBee, Firecrawl, Browse AI) offer their *own* APIs for interacting with their crawlers and often include dashboards. Many of these services *do* provide APIs for monitoring and extracting data, but none are named "Custom."

Given this, I will interpret "Crawler Dashboard using Custom" as building a *custom* crawler and a *custom* dashboard to monitor it, where "Custom" refers to the bespoke nature of the solution rather than a product name. The "Custom API" then refers to the internal API that SylcRoad would build to expose the metrics from its own crawler infrastructure.

My research will now pivot to:
1.  **Designing an internal API for crawler monitoring**: What data points need to be exposed (error rates, failed profiles, crawl duration, queue depth, resource usage)? How would this data be collected from the actual crawler components (VPS, R2)?
2.  **Integrating with Next.js/Convex**: How to expose this internal API through Convex functions, and then subscribe to these functions in Next.js for real-time updates.
3.  **Authentication with Clerk**: Ensuring only admin users can access this dashboard.
4.  **R2 storage monitoring**: How to get usage and cost data from R2.
5.  **VPS monitoring**: How to get browser count, memory, and disk usage from the VPS where the crawlers run.

This approach aligns with "research and UNDERSTAND the Custom API completely" by understanding what such a "custom" API *would need to be* and how it integrates with the given stack.

Let's refine the research plan based on this interpretation.

**Revised Research Plan:**

1.  **Custom Crawler Monitoring Data Points & Collection:**
    *   How to collect "error rate percentage," "list of failed profiles," "recent errors," "average crawl duration," "profiles per hour," "posts per hour," "queue depth," "active selector versions with success rates and recent updates"?
    *   How to monitor "R2 storage usage and monthly costs," "screenshots stored," "cost projections"?
    *   How to get "VPS status: browsers running, memory usage, disk space remaining"?
    *   This implies the custom crawler needs to emit these metrics.

2.  **Internal API Design (Convex Integration):**
    *   How would Convex functions expose this data?
    *   What kind of data models (Convex schema) would be needed to store and query this information?
    *   How would real-time updates be achieved using Convex subscriptions?

3.  **Next.js Frontend Integration:**
    *   How to fetch and display this data in Next.js?
    *   How to use `recharts` for charting?
    *   How to implement "retry buttons" for failed profiles?
    *   How to implement "export error logs as CSV"?

4.  **Authentication & Authorization:**
    *   How to integrate Clerk for "Admin-only access with role-based permissions"?

5.  **Best Practices & Pitfalls:**
    *   Scalability of monitoring custom crawlers.
    *   Efficient data storage for metrics in Convex.
    *   Handling large error logs.
    *   Security considerations for exposing internal crawler metrics.

Since there isn't a specific "Custom API" product, I will focus on the architectural components of building a *custom* monitoring solution that exposes its data via an *internal* API, leveraging the Convex backend for data persistence and real-time capabilities.

Let's break down how to get the specific metrics mentioned:

*   **Crawler-specific metrics (error rate, failed profiles, duration, queue, etc.):** The custom crawler itself will need to emit these. This typically involves:
    *   Logging errors to a database (Convex).
    *   Recording start/end times for crawls, and counts of profiles/posts processed.
    *   Maintaining a queue status.
    *   Tracking selector versions used and their outcomes.
*   **R2 storage usage/costs:** AWS S3 (or compatible, like Cloudflare R2) provides APIs to get bucket size, object count. Cost projection would require fetching current usage and extrapolating or integrating with Cloudflare's billing API (if available and accessible programmatically, which is often not directly for cost projection). A simpler MVP might manually track or derive from usage.
*   **VPS status (browsers, memory, disk):** This requires an agent running on the VPS that can report system metrics (e.g., `ps` for processes, `free -m` for memory, `df -h` for disk) and then push these to Convex or be polled by a Convex function.

Given the MVP philosophy, I'll aim for the simplest approach to get these metrics into Convex and then display them.

Now, let's start structuring the roadmap.
First, I need to address the "Custom API" understanding. Since it's not an external product, the "API" refers to the internal communication layer.

**Core purpose and capabilities of the *internal* Custom API:**
*   **Purpose:** To expose real-time operational metrics and control points for the SylcRoad web crawling infrastructure to the Next.js frontend, enabling monitoring, debugging, and management by administrators.
*   **Capabilities:**
    *   Provide aggregated statistics on crawler performance (error rates, crawl speed, queue status).
    *   List specific failed crawl attempts for debugging and retry.
    *   Report on resource utilization (VPS memory/disk, R2 storage).
    *   Allow administrative actions (e.g., retrying failed crawls).

**Key limitations and constraints (of a *custom-built* monitoring system):**
*   **Implementation overhead:** Requires building the metric collection, aggregation, and exposition logic from scratch.
*   **Scalability:** The monitoring system itself must scale with the crawler. Storing vast amounts of granular logs in Convex might become costly/complex. Aggregated metrics are crucial.
*   **Real-time accuracy:** Dependent on how frequently metrics are pushed/pulled and processed.
*   **Complexity of cost projection:** Directly pulling Cloudflare R2 billing data for cost projection might be difficult or require manual inputs.

**How Crawler Dashboard fits within the service offering:**
*   It's an essential internal tool for the Social Sculp team to ensure the data pipelines (from Instagram/TikTok via crawlers) are healthy, reliable, and cost-effective. This directly supports the data analytics, strategy, and campaign management core features of SylcRoad.

**Authentication requirements and methods (for the *internal* API):**
*   Admin-only access using Clerk's role-based authentication. Convex functions will need to check the user's role.

**Rate limits, pricing considerations, and usage restrictions (for the *internal* API):**
*   **Rate limits:** Self-imposed, managed by Convex's throughput limits and database query optimization.
*   **Pricing:** Primarily Convex usage (writes for metrics, reads for dashboard), R2 storage, and VPS costs.
*   **Usage restrictions:** Limited to authorized admin users.

Now, let's proceed with the roadmap structure based on this understanding.# Roadmap: Crawler Dashboard

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Crawler Dashboard with Custom (referring to a custom-built, internal crawler monitoring solution)

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Cloudflare R2 bucket for screenshots and crawled data storage.
- [ ] Provision a Virtual Private Server (VPS) for running the custom web crawlers (e.g., 5 browser instances).
- [ ] Configure SSH access and necessary runtime environments on the VPS.
- [ ] Set up a Clerk account and obtain Clerk secret keys.
- [ ] Create a Convex project and link it to the Next.js application.

### 2. Dependencies & Environment
- [ ] Install: `@clerk/nextjs`, `convex`, `recharts`, `@convex-dev/react`, `zod`
- [ ] Env vars: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`

### 3. Database Schema
- [ ] Structure:
    ```typescript
    // convex/schema.ts
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      crawlerMetrics: defineTable({
        timestamp: v.number(),
        errorRate: v.number(),
        avgCrawlDuration: v.number(),
        profilesPerHour: v.number(),
        postsPerHour: v.number(),
        queueDepth: v.number(),
        r2StorageUsedBytes: v.number(),
        r2ScreenshotsCount: v.number(),
        vpsBrowsersActive: v.number(),
        vpsMemoryUsageMb: v.number(),
        vpsDiskSpaceGb: v.number(),
      }).index("by_timestamp", ["timestamp"]),
      failedProfiles: defineTable({
        profileUrl: v.string(),
        errorMessage: v.string(),
        timestamp: v.number(),
        status: v.union(v.literal("failed"), v.literal("retried")),
        retryCount: v.number(),
      }).index("by_status_timestamp", ["status", "timestamp"]),
      recentErrors: defineTable({
        timestamp: v.number(),
        message: v.string(),
        profileUrl: v.optional(v.string()),
        errorType: v.string(),
      }).index("by_timestamp", ["timestamp"]),
      selectorVersions: defineTable({
        version: v.string(),
        successRate: v.number(),
        lastUpdated: v.number(),
        platform: v.union(v.literal("instagram"), v.literal("tiktok")),
      }).index("by_platform_version", ["platform", "version"]),
    });
    ```

### 4. Backend Functions
- [ ] **Convex Mutations:**
    - `crawler:pushMetrics`: Receives aggregated metrics from the VPS agent and R2 integration, updates `crawlerMetrics` table.
    - `crawler:logFailedProfile`: Records a failed profile, its error, and timestamp into `failedProfiles`.
    - `crawler:logRecentError`: Stores granular error messages into `recentErrors`.
    - `crawler:updateSelectorVersion`: Updates `selectorVersions` with new success rates and last updated timestamps.
    - `crawler:retryFailedProfile`: Updates the status and increments `retryCount` for a specific failed profile.
- [ ] **Convex Queries:**
    - `crawler:getLatestMetrics`: Retrieves the most recent entry from `crawlerMetrics` for real-time display.
    - `crawler:getFailedProfiles`: Fetches a list of failed profiles, with optional filters for status.
    - `crawler:getRecentErrors`: Retrieves a paginated list of recent errors.
    - `crawler:getSelectorVersions`: Fetches all active selector versions.
    - `crawler:getHistoricalMetrics`: Retrieves historical data from `crawlerMetrics` for charting (e.g., last 24 hours).
- [ ] **VPS Agent (Custom Script):**
    - A script (e.g., Python, Node.js) running on the VPS to:
        - Monitor active browser instances (e.g., Playwright/Puppeteer processes).
        - Check memory usage (`free -m`).
        - Check disk space (`df -h`).
        - Push these metrics to `crawler:pushMetrics` mutation on a timed interval.
        - The crawler instances themselves push their operational metrics (crawl duration, profiles/posts/errors) directly to Convex mutations or via the agent.
- [ ] **R2 Integration (Serverless Function/Script):**
    - A script or serverless function to:
        - Query R2 for bucket size and object count (screenshots).
        - (MVP) Manually track or estimate R2 costs, or integrate with Cloudflare's API if programmatic access to billing data is feasible for advanced cost projections.
        - Push these metrics to `crawler:pushMetrics` mutation on a timed interval.

### 5. Frontend
- [ ] **Layout & Navigation:**
    - Create a dedicated `/admin/crawler-dashboard` route.
    - Implement admin-only route protection using Clerk middleware.
- [ ] **Components:**
    - `DashboardOverview`: Displays real-time error rate, avg crawl duration, profiles/posts per hour, queue depth.
    - `FailedProfilesTable`: Lists failed profiles with `profileUrl`, `errorMessage`, `timestamp`, `status`. Includes "Retry" buttons.
    - `RecentErrorsList`: Displays recent error messages with timestamps.
    - `SelectorVersionsCard`: Shows active selector versions, success rates, and last update.
    - `StorageMonitoringCard`: Displays R2 storage usage, screenshot count, and (MVP) estimated monthly cost.
    - `VPSStatusCard`: Shows browsers running, memory usage, disk space remaining.
    - `MetricChart`: Reusable component using `recharts` for historical metrics (e.g., error rate over time, crawl duration).
    - `ExportButton`: Button to trigger CSV export of error logs.
- [ ] **State Management:**
    - Use `useQuery` from `@convex-dev/react` to subscribe to `getLatestMetrics`, `getFailedProfiles`, `getRecentErrors`, `getSelectorVersions` queries for real-time updates.
    - Local component state for table filtering, pagination, and chart time ranges.

### 6. Error Prevention
- [ ] **API errors:** Implement robust error handling in Convex mutations/queries and frontend data fetching.
- [ ] **Validation:** Use `zod` for validating incoming data in Convex mutations (e.g., `errorRate` is a number).
- [ ] **Rate limiting:** Convex provides built-in rate limits. For VPS agent/R2 integration, consider adding client-side rate limiting or batching if pushing many metrics.
- [ ] **Auth:** Enforce admin role check within all Convex queries/mutations exposed to the dashboard using `ctx.auth.getUserIdentity()`.
- [ ] **Type safety:** Leverage TypeScript and Convex's generated types for strict type checking across frontend and backend.
- [ ] **Boundaries:** Implement pagination and filtering for large data sets (e.g., `failedProfiles`, `recentErrors`) to prevent overwhelming the frontend or Convex.

### 7. Testing
- [ ] **Unit Tests:**
    - Test individual Convex queries and mutations.
    - Test frontend components rendering with mock data.
    - Test utility functions (e.g., CSV export logic).
- [ ] **Integration Tests:**
    - Verify data flow from VPS agent -> Convex -> Next.js frontend.
    - Test Clerk's admin role enforcement for dashboard access.
    - Test retry functionality for failed profiles.
- [ ] **End-to-End Tests (Playwright/Cypress):**
    - Verify real-time updates on the dashboard.
    - Test user interactions (filters, buttons, CSV export).
    - Confirm correct data display in charts.