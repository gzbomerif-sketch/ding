---
name: agent-custom-performance-dashboard
description: Implements a Performance Dashboard using a Custom API and Convex for backend logic.
model: inherit
color: purple
---


# Agent: Performance Dashboard Implementation with Custom API

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for integrating a "Custom API" (representing any external or internal analytics/data API) to build a Performance Dashboard within a Next.js application, leveraging Convex for all backend logic, data persistence, and real-time updates. It focuses on using Convex Actions for external API calls, Mutations for data storage, and Queries for real-time display.
**Tech Stack**: Next.js, React, Convex, Clerk (Authentication), Custom API (external data source).
**Source**: Convex Documentation, Clerk Documentation, Next.js Documentation.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
As of late 2025, Convex continues to emphasize:
*   **Convex Actions for Side Effects**: This is the **primary mechanism** for interacting with external services, including any "Custom API". Actions run on a Node.js runtime, allowing standard HTTP requests and complex logic.
*   **Real-time Subscriptions are Core**: Convex queries automatically provide real-time updates without extra effort, making them ideal for dashboards where data freshness is key.
*   **Schema-first Development**: Defining your Convex schema (`convex/schema.ts`) is crucial for data integrity and efficient queries.
*   **Improved `auth` context in Actions/Mutations**: Accessing `ctx.auth.getUserIdentity()` provides robust authentication information from providers like Clerk.

### 2. Common Pitfalls & Solutions 🚨
*   **Pitfall**: Making direct `fetch` calls to external APIs from Convex Mutations or Queries.
    *   **Solution**: **NEVER** perform external API calls directly from Convex Mutations or Queries. They are designed for atomic database operations and data reads, respectively. All external HTTP requests *must* be encapsulated within a Convex Action. Mutations/Queries are for *after* data is fetched or *before* data is sent to the Custom API (e.g., recording a request).
*   **Pitfall**: Exposing sensitive API keys directly in frontend code or Convex Queries.
    *   **Solution**: Store all API keys as Convex environment variables (`npx convex env add ...`). Access them securely within Convex Actions via `process.env.YOUR_API_KEY`. Never pass them to the frontend.
*   **Pitfall**: Inefficient data fetching from the Custom API (e.g., refetching entire datasets for minor updates).
    *   **Solution**: Design your Convex Actions to fetch only necessary data from the Custom API. Consider caching strategies within your Convex Actions if the Custom API has strict rate limits or slow response times, potentially storing aggregated data in Convex Mutations.
*   **Pitfall**: Complex client-side state management for dashboard filters leading to prop-drilling or inconsistent data.
    *   **Solution**: Lift filter state to a parent component or use a global state management library (e.g., Zustand, Redux). Pass filters down to your Convex Query hooks or as arguments to Convex Actions that retrieve data.

### 3. Best Practices 🚨
*   **Modular Convex API**: Organize your Convex functions logically (e.g., `convex/customApi.ts` for actions interacting with the Custom API, `convex/dashboard.ts` for mutations/queries storing/retrieving dashboard data).
*   **Error Handling and Retries**: Implement robust error handling within your Convex Actions for Custom API calls. Consider retry mechanisms for transient network issues.
*   **Authentication & Authorization**: Use `ctx.auth.getUserIdentity()` in Convex Actions/Mutations/Queries to ensure only authenticated and authorized users can access sensitive dashboard data or trigger API calls.
*   **Payload Validation**: Validate incoming data from the Custom API within your Convex Actions before persisting it to the Convex database. Similarly, validate input parameters for your Convex functions.
*   **Idempotency**: Design your Convex Mutations to be idempotent where possible, especially if they are triggered by external services or could be retried.
*   **Batching**: If the Custom API supports it, batch requests within a Convex Action to reduce the number of HTTP calls and improve performance.

## Implementation Steps

1.  **Define Custom API Data Models**: Understand the structure of data returned by your "Custom API" (e.g., `performance_metrics`, `campaigns`, `influencers`).
2.  **Convex Schema Definition**: Create a Convex schema (`convex/schema.ts`) that mirrors the data you'll store from the Custom API.
3.  **Convex Action for Custom API Calls**: Write a Convex Action (`convex/customApi.ts`) to make authenticated requests to your "Custom API", fetch relevant performance data, and perform any initial data transformation.
4.  **Convex Mutation for Data Persistence**: Write a Convex Mutation (`convex/dashboard.ts`) to store the processed data from the Convex Action into your Convex database. This can be triggered by the Action or independently.
5.  **Convex Query for Dashboard Data**: Create a Convex Query (`convex/dashboard.ts`) to retrieve and subscribe to the relevant performance data for the dashboard, accepting filter parameters (date range, platform, CPM).
6.  **Next.js Frontend Integration**:
    *   Create dashboard components.
    *   Use Convex `useQuery` hooks to fetch and display real-time data.
    *   Implement UI for filter controls (Date Range, Platform, CPM).
    *   Trigger Convex Actions (e.g., via `useMutation` or `useAction`) for data refresh or to update the underlying data via the Custom API.
7.  **Authentication (Clerk)**: Protect Convex functions using Clerk's `ctx.auth` to ensure only authenticated users can access the dashboard.
8.  **Environment Variables**: Configure Custom API keys and other sensitive variables securely in Convex.

### Backend Implementation

#### Convex Functions (Primary)
*   **`customApi/fetchDashboardData` (Convex Action)**:
    *   **Purpose**: Orchestrates calls to the external "Custom API". It takes parameters like `dateRange`, `platform`, `cpmFilter`, `userId` from the frontend.
    *   **Logic**:
        1.  Authenticates user via `ctx.auth`.
        2.  Constructs appropriate requests to the "Custom API" using `fetch` (e.g., to fetch campaign performance, influencer data).
        3.  Includes necessary API keys from `process.env`.
        4.  Transforms the raw data from the Custom API into a format suitable for your Convex database.
        5.  (Optional but Recommended) Triggers a Convex Mutation to persist or update this data in your Convex tables for caching/history.
        6.  Returns processed data (or an acknowledgment of successful persistence).
*   **`dashboard/storePerformanceData` (Convex Mutation)**:
    *   **Purpose**: Persists the fetched and processed dashboard data into Convex tables.
    *   **Logic**:
        1.  Accepts structured data (e.g., `campaignId`, `metrics`, `platform`, `date`, `cpmCalculation`).
        2.  Uses `ctx.db.insert` or `ctx.db.patch` to store/update records in `performanceMetrics` or `campaigns` tables.
        3.  Performs data validation and ensures data integrity according to the schema.
*   **`dashboard/getDashboardOverview` (Convex Query)**:
    *   **Purpose**: Retrieves aggregated or detailed performance data for the dashboard, with real-time updates.
    *   **Logic**:
        1.  Accepts filter parameters: `dateRange`, `platform`, `cpmFilter`.
        2.  Uses `ctx.db.query` to fetch data from `performanceMetrics` or `campaigns` tables, applying filters.
        3.  Performs any necessary aggregations or calculations for display (e.g., sum total budget, count campaigns).
        4.  Returns the dashboard data structure.

### Frontend Integration
*   **`useQuery` for Real-time Data**: Use `useQuery(api.dashboard.getDashboardOverview, { dateRange, platform, cpmFilter })` in dashboard components to fetch data reactively.
*   **`useAction` / `useMutation` for Data Updates/Refreshes**:
    *   Trigger `useAction(api.customApi.fetchDashboardData)` when filters change or on a manual refresh to pull new data from the Custom API.
    *   If `CPM Calculation Feature` needs to update data *in Convex* (e.g., store the calculated CPM), use `useMutation(api.dashboard.updateCpm)` after calculation.
*   **Filter Components**: Implement `DateRangeSelector`, `PlatformFilter`, `CPMFilter` components. Their state changes should trigger re-fetching of dashboard data by updating the arguments passed to `useQuery` or by calling the relevant `useAction`.
*   **Authentication Flow**: Ensure Clerk `useUser()` or `useAuth()` hooks are integrated to control access and pass user identity to Convex functions.

## Code Patterns

### Convex Backend Functions

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  performanceMetrics: defineTable({
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    date: v.string(), // YYYY-MM-DD
    impressions: v.number(),
    clicks: v.number(),
    cpm: v.number(), // Cost Per Mille (1000 views)
    cost: v.number(),
    roi: v.number(),
    // Add other relevant metrics
  }).index("by_campaign_date_platform", ["campaignId", "date", "platform"]),
  campaigns: defineTable({
    name: v.string(),
    clientId: v.string(), // From Clerk userId
    budget: v.number(),
    startDate: v.string(),
    endDate: v.string(),
    // ... other campaign metadata
  }).index("by_clientId", ["clientId"]),
});
```

```typescript
// convex/customApi.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const fetchDashboardData = action({
  args: {
    dateRangeStart: v.string(), // YYYY-MM-DD
    dateRangeEnd: v.string(),   // YYYY-MM-DD
    platforms: v.optional(v.array(v.union(v.literal("TikTok"), v.literal("Instagram")))),
    clientId: v.string(), // Clerk user ID
  },
  handler: async (ctx, args) => {
    // 1. Authenticate and Authorize
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    if (identity.subject !== args.clientId) {
      // Ensure the user is requesting data for their own client
      throw new Error("Unauthorized access to client data");
    }

    // CRITICAL: Access sensitive API key from environment variables
    const CUSTOM_API_KEY = process.env.CUSTOM_ANALYTICS_API_KEY;
    if (!CUSTOM_API_KEY) {
      throw new Error("Custom API key not configured");
    }

    // 2. Make external API calls (hypothetical Custom API)
    // This is where you would call your actual external analytics API.
    // Example using fetch (replace with your actual API endpoint and parameters)
    const apiUrl = `https://your-custom-api.com/v1/performance?`;
    const params = new URLSearchParams({
      start_date: args.dateRangeStart,
      end_date: args.dateRangeEnd,
      client_id: args.clientId,
      // Add platform filter if provided
      ...(args.platforms && { platforms: args.platforms.join(',') }),
    });

    let apiResponse;
    try {
      const response = await fetch(`${apiUrl}${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${CUSTOM_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Custom API error: ${response.status} - ${errorBody}`);
        throw new Error(`Failed to fetch data from Custom API: ${response.statusText}`);
      }
      apiResponse = await response.json();
    } catch (error) {
      console.error("Error making Custom API call:", error);
      throw new Error(`Error fetching data: ${error.message}`);
    }

    // 3. Process and Transform Data
    const processedData = apiResponse.data.map( (item: any) => ({
      campaignId: item.campaignId, // Map to Convex Id if needed, or create new
      platform: item.platform,
      date: item.date,
      impressions: item.impressions,
      clicks: item.clicks,
      cpm: item.cpm, // This might be calculated by the custom API
      cost: item.cost,
      roi: item.roi,
      // ... more metrics
    }));

    // 4. (Optional) Persist data to Convex via a Mutation
    // This makes the data available for real-time queries and reduces
    // direct Custom API calls on subsequent dashboard loads.
    await ctx.runMutation(api.dashboard.storePerformanceData, {
      clientId: args.clientId,
      metrics: processedData,
    });

    return { success: true, message: "Data fetched and stored." };
  },
});
```

```typescript
// convex/dashboard.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const storePerformanceData = mutation({
  args: {
    clientId: v.string(),
    metrics: v.array(v.object({
      campaignId: v.string(), // Assuming string ID from Custom API, map to Convex Id below
      platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
      date: v.string(),
      impressions: v.number(),
      clicks: v.number(),
      cpm: v.number(),
      cost: v.number(),
      roi: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate and Authorize
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    if (identity.subject !== args.clientId) {
      throw new Error("Unauthorized: Cannot store data for another client.");
    }

    for (const metric of args.metrics) {
      // Find or create campaign to get a Convex Id
      let campaign = await ctx.db.query("campaigns")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
        .filter((q) => q.eq(q.field("name"), `Campaign-${metric.campaignId}`)) // Assuming name mapping for now
        .first();

      let convexCampaignId;
      if (campaign) {
        convexCampaignId = campaign._id;
      } else {
        // Create a dummy campaign if it doesn't exist for now, or fetch actual campaign data
        convexCampaignId = await ctx.db.insert("campaigns", {
          name: `Campaign-${metric.campaignId}`,
          clientId: args.clientId,
          budget: 0, // Placeholder
          startDate: metric.date,
          endDate: metric.date,
        });
      }

      // Check if metric already exists for idempotency (optional, depends on granularity)
      const existingMetric = await ctx.db.query("performanceMetrics")
        .withIndex("by_campaign_date_platform", (q) =>
          q.eq("campaignId", convexCampaignId)
           .eq("date", metric.date)
           .eq("platform", metric.platform)
        ).first();

      if (existingMetric) {
        await ctx.db.patch(existingMetric._id, { ...metric, campaignId: convexCampaignId });
      } else {
        await ctx.db.insert("performanceMetrics", { ...metric, campaignId: convexCampaignId });
      }
    }
  },
});

export const getDashboardOverview = query({
  args: {
    dateRangeStart: v.string(), // YYYY-MM-DD
    dateRangeEnd: v.string(),   // YYYY-MM-DD
    platforms: v.optional(v.array(v.union(v.literal("TikTok"), v.literal("Instagram")))),
    cpmThreshold: v.optional(v.number()), // For CPM filter
    clientId: v.string(), // Clerk user ID
  },
  handler: async (ctx, args) => {
    // 1. Authenticate and Authorize
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Or throw error, depending on UX
    }
    if (identity.subject !== args.clientId) {
      throw new Error("Unauthorized: Cannot view another client's dashboard.");
    }

    let query = ctx.db.query("performanceMetrics")
      .filter((q) => q.and(
        q.eq(q.field("clientId"), args.clientId), // Filter by client ID
        q.gte(q.field("date"), args.dateRangeStart),
        q.lte(q.field("date"), args.dateRangeEnd)
      ));

    if (args.platforms && args.platforms.length > 0) {
      query = query.filter((q) => q.or(...args.platforms!.map(p => q.eq(q.field("platform"), p))));
    }

    if (args.cpmThreshold !== undefined) {
      // Filter for CPM less than or equal to the threshold for "best ROI"
      query = query.filter((q) => q.lte(q.field("cpm"), args.cpmThreshold!));
    }

    const metrics = await query.collect();

    // Perform aggregations for the dashboard overview
    const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
    const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
    const totalCost = metrics.reduce((sum, m) => sum + m.cost, 0);
    const averageCpm = totalImpressions > 0 ? (totalCost / totalImpressions) * 1000 : 0;
    // ... calculate other summary stats

    // Example of joining with campaign data if needed
    const campaignIds = [...new Set(metrics.map(m => m.campaignId))];
    const campaigns = await Promise.all(
        campaignIds.map(id => ctx.db.get(id))
    );
    const campaignDetails = campaigns.filter(Boolean).map(c => ({
        _id: c!._id,
        name: c!.name,
        budget: c!.budget,
    }));

    return {
      metrics,
      summary: {
        totalImpressions,
        totalClicks,
        totalCost,
        averageCpm,
        // ...
      },
      campaigns: campaignDetails,
    };
  },
});

// Example for CPM Calculation Feature (if API is NOT used, frontend calculates and stores)
export const updateCpmManually = mutation({
    args: {
        metricId: v.id("performanceMetrics"),
        newCpm: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Not authenticated");
        }
        // Additional authorization: check if user owns the metric
        const metric = await ctx.db.get(args.metricId);
        if (!metric) throw new Error("Metric not found");
        const campaign = await ctx.db.get(metric.campaignId);
        if (!campaign || campaign.clientId !== identity.subject) {
            throw new Error("Unauthorized to update this metric.");
        }

        await ctx.db.patch(args.metricId, { cpm: args.newCpm });
        return { success: true };
    }
});
```

## Testing & Debugging
*   **Convex Dev Console**: Use `npx convex dev` and the Convex Dashboard to inspect logs, view database contents, and manually trigger/test mutations/actions.
*   **Unit Testing (Convex)**: While Convex doesn't have a built-in testing framework, you can mock `ctx` for simple unit tests of pure logic within your functions using a tool like Vitest or Jest.
*   **Integration Testing**: Test the full flow from frontend filter selection -> Convex Action -> Custom API call -> Convex Mutation -> Convex Query -> Frontend display.
*   **Frontend Dev Tools**: Use browser developer tools to inspect network requests to Convex and verify data structures.
*   **Convex `console.log`**: Use `console.log` liberally within your Convex functions for debugging. These logs appear in your Convex dashboard and `npx convex dev` output.
*   **Clerk Debugging**: Use the Clerk Dashboard to inspect user sessions and tokens, ensuring authentication is working correctly.

## Environment Variables
Ensure the following environment variables are set for your Convex deployment and local development:

```
# .env.local (for local development)
CONVEX_DEPLOYMENT=<your-convex-deployment-url>
CUSTOM_ANALYTICS_API_KEY=sk_your_custom_api_key_here
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>

# For Convex Deployment (add via `npx convex env add ...`)
# This is accessed within Convex Actions/Mutations/Queries
CUSTOM_ANALYTICS_API_KEY
```

**CRITICAL**: `CUSTOM_ANALYTICS_API_KEY` MUST be added using `npx convex env add CUSTOM_ANALYTICS_API_KEY --type string` for your Convex deployment, and *never* be exposed on the frontend.

## Success Metrics
*   **Real-time Data Display**: Dashboard data updates instantly when new data is available or filters change (via Convex `useQuery`).
*   **Accurate Filter Application**: Date range, platform, and CPM filters correctly narrow down displayed data.
*   **CPM Calculation Feature**: The CPM calculation (either from Custom API or frontend logic) is accurate and can be displayed.
*   **Secure API Calls**: All external API interactions occur through Convex Actions, with API keys securely stored and managed.
*   **Data Persistence**: Processed dashboard data is reliably stored and retrieved from the Convex database.
*   **Authentication & Authorization**: Only authenticated and authorized users can view and interact with their respective client's dashboard data.
*   **Error Handling**: Graceful error handling for Custom API failures or network issues.