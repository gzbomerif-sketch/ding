---
name: agent-convex-campaign-analytics
description: Implements campaign analytics dashboard using Convex queries, mutations, and actions.
model: inherit
color: purple
---


# Agent: Campaign Analytics Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing a live analytics dashboard for campaign performance using Convex as the primary backend, integrated with Next.js and Clerk for authentication. It clarifies that "Custom API" refers to an **internal, Convex-based API** responsible for serving data from the `performance_metrics` table, which is populated by an external scraper.
**Tech Stack**: Next.js (React), Convex (Database, Backend Logic), Clerk (Authentication), Data Visualization Library (e.g., Recharts, Chart.js).

## Critical Implementation Knowledge

### 1. "Custom API" Interpretation 🚨
**Clarification**: The term "Custom API" in this context refers to the **backend data access layer built directly on Convex**. It does *not* imply an external, third-party service named "Custom API." All data for the analytics dashboard will be served directly from your Convex backend using Convex Queries, Mutations, and Actions. The scraper is an *external process* that populates the Convex `performance_metrics` table.

### 2. Convex Latest Updates 🚨
Convex continuously evolves, primarily focusing on developer experience, performance, and features like file storage and Deno runtime capabilities. Keep an eye on the official [Convex Changelog](https://www.convex.dev/changelog) and [Documentation](https://docs.convex.dev/) for the most recent updates on:
*   **Deno Runtime**: All Convex functions (queries, mutations, actions) run in a Deno environment. Ensure your code is compatible with Deno's Web APIs and module resolution.
*   **File Storage**: While not directly used for campaign metrics data, Convex File Storage is available for other asset management if needed.
*   **Auth Enhancements**: Continuous improvements to authentication integration, especially with providers like Clerk. Always refer to the latest [Convex Auth documentation](https://docs.convex.dev/auth).

### 3. Common Pitfalls & Solutions 🚨
*   **Over-fetching Data in Queries**: Avoid querying all `performance_metrics` data at once. Implement efficient queries with filters (date range, platform) and aggregation directly in Convex to return only the necessary data for the current view.
*   **Complex Aggregations in Frontend**: While feasible, performing complex aggregations (e.g., average CPM across campaigns, engagement rate) solely in the frontend can lead to performance issues and duplicated logic. **Push aggregation logic into Convex Queries or Actions** for better performance and maintainability.
*   **Unauthenticated Queries**: For client dashboards, ensure Convex queries include authentication checks using `ctx.auth.getUserIdentity()`. Only authorized users should access campaign data.
*   **Scraper Data Inconsistency**: If the scraper pushes data in batches or intermittently, ensure your Convex mutations handle potential duplicate entries or upsert logic (`db.insert` vs. `db.patch` or custom upsert logic with `db.get` and `db.insert`/`db.patch`).
*   **Large Dataset Performance**: For historical data over long periods, consider indexing strategies in `convex/schema.ts` to optimize query performance (e.g., by `timestamp`, `platform`, `campaignId`).
*   **Rate Limits**: Be mindful of Convex query/mutation/action limits. Optimize queries to fetch minimal data and batch mutations from the scraper if possible to stay within limits.

### 4. Best Practices 🚨
*   **Convex Schema First**: Define a robust `convex/schema.ts` with appropriate indexes to support your queries for date ranges, platforms, and specific campaign IDs.
*   **Modular Convex Functions**: Organize your Convex functions (`queries`, `mutations`, `actions`) logically within `convex/` directory (e.g., `convex/performanceMetrics.ts`, `convex/campaigns.ts`).
*   **Type Safety**: Leverage Convex's type generation (`npx convex codegen`) to ensure strong type safety between your frontend and backend functions.
*   **Real-time Subscriptions**: Use `useQuery` in Next.js components to automatically subscribe to data changes, providing real-time updates for the dashboard.
*   **Error Handling**: Implement robust error handling in both Convex functions and frontend components for API calls and data processing.
*   **Secure Environment Variables**: Manage API keys and other sensitive information securely using `.env.local` for local development and Convex environment variables for deployment.

## Implementation Steps

The implementation involves setting up the Convex backend for data storage and retrieval, and then integrating this with the Next.js frontend to display the analytics.

### Backend Implementation (Convex)
1.  **Define Convex Schema**: Create `performance_metrics` table with necessary fields and indexes.
2.  **Scraper Data Ingestion**: Implement a Convex Mutation (`addPerformanceMetrics`) to allow your external scraper to insert/update performance data.
3.  **Aggregate Metrics Query**: Implement a Convex Query (`getAggregatedMetrics`) to fetch summary cards (total views, likes, comments, etc.) for a given date range and platform.
4.  **Time-Series Data Query**: Implement a Convex Query (`getMetricsOverTime`) to fetch data points for the interactive line chart over a specific date range, potentially grouped by day/week.
5.  **Authentication Rules**: Secure all relevant queries and mutations using Clerk authentication.

### Frontend Integration (Next.js)
1.  **Convex Client Setup**: Initialize the Convex client and integrate with Clerk authentication.
2.  **Dashboard Component**: Create a main dashboard component.
3.  **Filter Controls**: Implement UI for date range selection, platform filter, and CPM filter.
4.  **Metric Cards**: Display aggregated metrics using `useQuery` calls to `getAggregatedMetrics`.
5.  **Interactive Chart**: Integrate a charting library (e.g., Recharts) and populate it with data from `useQuery` calls to `getMetricsOverTime`.
6.  **Real-time Updates**: Leverage Convex's `useQuery` to ensure the dashboard automatically updates when new data is pushed by the scraper.

## Code Patterns

### Convex Backend Functions

#### 1. `convex/schema.ts`
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  performance_metrics: defineTable({
    campaignId: v.id("campaigns"), // Assuming a campaigns table for context
    platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
    timestamp: v.number(), // Unix timestamp for efficient date range queries
    views: v.number(),
    likes: v.number(),
    comments: v.number(),
    shares: v.number(),
    engagementRate: v.number(), // Calculated by scraper or Convex action
    cpm: v.number(), // Cost Per Mille
    // Add other relevant metrics
  })
  .index("by_campaign_platform_timestamp", ["campaignId", "platform", "timestamp"])
  .index("by_platform_timestamp", ["platform", "timestamp"])
  .searchIndex("search_by_campaign_id", {
    searchField: "campaignId"
  }),
  // You might have a 'campaigns' table too
  campaigns: defineTable({
    name: v.string(),
    clientId: v.id("users"), // Assuming Clerk 'users' table
    status: v.string(),
    startDate: v.number(),
    endDate: v.number(),
  })
  .index("by_client", ["clientId"]),
});
```

#### 2. `convex/performanceMetrics.ts`
```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Mutation to ingest data from scraper
export const addPerformanceMetrics = mutation({
  args: {
    metrics: v.array(v.object({
      campaignId: v.id("campaigns"),
      platform: v.union(v.literal("TikTok"), v.literal("Instagram")),
      timestamp: v.number(),
      views: v.number(),
      likes: v.number(),
      comments: v.number(),
      shares: v.number(),
      engagementRate: v.number(),
      cpm: v.number(),
    }))
  },
  handler: async (ctx, { metrics }) => {
    // You might want to implement upsert logic here
    // For simplicity, this example just inserts new documents.
    // In a real scenario, you'd check for existing metrics for a given timestamp/campaign/platform
    // and use db.patch for updates.
    const inserts = metrics.map(metric => ctx.db.insert("performance_metrics", metric));
    await Promise.all(inserts);
    console.log(`Inserted ${metrics.length} performance metrics.`);
  },
});

// Query to get aggregated metrics for cards
export const getAggregatedMetrics = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    platform: v.optional(v.union(v.literal("TikTok"), v.literal("Instagram"))),
    startDate: v.number(), // Unix timestamp
    endDate: v.number(),   // Unix timestamp
  },
  handler: async (ctx, { campaignId, platform, startDate, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Example: Assuming client ID is available from identity or associated campaign
    // For this example, we'll fetch all matching client's data.
    // In a real app, you'd link identity.subject to a user in your 'users' table,
    // then query campaigns by that user's ID.

    let metrics = await ctx.db
      .query("performance_metrics")
      .withIndex("by_platform_timestamp", (q) => {
        let query = q.ge("timestamp", startDate).le("timestamp", endDate);
        if (platform) {
          query = query.eq("platform", platform);
        }
        return query;
      })
      .collect();

    if (campaignId) {
      metrics = metrics.filter(m => m.campaignId === campaignId);
    }
    
    // Aggregation logic
    const totalViews = metrics.reduce((sum, m) => sum + m.views, 0);
    const totalLikes = metrics.reduce((sum, m) => sum + m.likes, 0);
    const totalComments = metrics.reduce((sum, m) => sum + m.comments, 0);
    const totalShares = metrics.reduce((sum, m) => sum + m.shares, 0);
    const totalEngagementRate = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.engagementRate, 0) / metrics.length : 0;
    const averageCPM = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.cpm, 0) / metrics.length : 0;
    const livePosts = new Set(metrics.map(m => m.campaignId.toString())).size; // Simplified: unique campaign IDs with data

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagementRate,
      averageCPM,
      livePosts,
    };
  },
});

// Query to get time-series data for charts
export const getMetricsOverTime = query({
  args: {
    campaignId: v.optional(v.id("campaigns")),
    platform: v.optional(v.union(v.literal("TikTok"), v.literal("Instagram"))),
    startDate: v.number(),
    endDate: v.number(),
    // Potentially add a 'granularity' argument like 'day', 'week'
  },
  handler: async (ctx, { campaignId, platform, startDate, endDate }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    let metrics = await ctx.db
      .query("performance_metrics")
      .withIndex("by_platform_timestamp", (q) => {
        let query = q.ge("timestamp", startDate).le("timestamp", endDate);
        if (platform) {
          query = query.eq("platform", platform);
        }
        return query;
      })
      .collect();
    
    if (campaignId) {
      metrics = metrics.filter(m => m.campaignId === campaignId);
    }

    // Group by day for the chart (example)
    const dailyData: { [date: string]: Doc<"performance_metrics">[] } = {};
    metrics.forEach(metric => {
      const date = new Date(metric.timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
      if (!dailyData[date]) {
        dailyData[date] = [];
      }
      dailyData[date].push(metric);
    });

    const chartData = Object.keys(dailyData).sort().map(date => {
      const dayMetrics = dailyData[date];
      const views = dayMetrics.reduce((sum, m) => sum + m.views, 0);
      const likes = dayMetrics.reduce((sum, m) => sum + m.likes, 0);
      const comments = dayMetrics.reduce((sum, m) => sum + m.comments, 0);
      // ... aggregate other metrics for the day
      return { date, views, likes, comments /*, etc. */ };
    });

    return chartData;
  },
});
```

### Frontend Integration Example (Conceptual)

```typescript jsx
// components/CampaignDashboard.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { DateRangePicker } from "@/components/ui/date-range-picker"; // Example UI component
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Example UI component
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // Example charting lib

export default function CampaignDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime(), // Last 7 days
    endDate: Date.now(),
  });
  const [platformFilter, setPlatformFilter] = useState<"TikTok" | "Instagram" | undefined>(undefined);
  // Add state for campaignId filter, CPM filter etc.

  const aggregatedMetrics = useQuery(api.performanceMetrics.getAggregatedMetrics, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    platform: platformFilter,
    // Pass campaignId, etc.
  });

  const timeSeriesData = useQuery(api.performanceMetrics.getMetricsOverTime, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    platform: platformFilter,
    // Pass campaignId, etc.
  });

  if (aggregatedMetrics === undefined || timeSeriesData === undefined) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Campaign Analytics Dashboard</h1>

      {/* Filter Controls */}
      <div className="flex gap-4 mb-6">
        <DateRangePicker onSelect={setDateRange} />
        <Select onValueChange={(value) => setPlatformFilter(value === "all" ? undefined : value as "TikTok" | "Instagram")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="TikTok">TikTok</SelectItem>
            <SelectItem value="Instagram">Instagram</SelectItem>
          </SelectContent>
        </Select>
        {/* Add more filters here (CPM, Campaign Selector) */}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">Total Views</p>
          <p className="text-2xl font-semibold">{aggregatedMetrics.totalViews.toLocaleString()}</p>
        </div>
        <div className="p-4 border rounded-lg">
          <p className="text-sm text-gray-500">Avg. Engagement Rate</p>
          <p className="text-2xl font-semibold">{(aggregatedMetrics.totalEngagementRate * 100).toFixed(2)}%</p>
        </div>
        {/* Add more metric cards */}
      </div>

      {/* Interactive Line Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md h-[400px]">
        <h2 className="text-xl font-semibold mb-4">Metrics Over Time</h2>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeSeriesData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" /> {/* For views/likes */}
            {/* <YAxis yAxisId="right" orientation="right" /> For engagement rate if needed */}
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="views" stroke="#8884d8" name="Views" />
            <Line yAxisId="left" type="monotone" dataKey="likes" stroke="#82ca9d" name="Likes" />
            {/* Add more lines for comments, shares */}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

## Testing & Debugging

1.  **Convex Console**: Use the Convex dashboard (console.convex.dev) to inspect your database tables, query data, and monitor function logs and executions. This is crucial for verifying scraper data ingestion and query results.
2.  **`npx convex run`**: Test individual Convex queries, mutations, and actions directly from your terminal using `npx convex run convex/myFunctions.ts:myQuery --arg1 value1`. This allows isolated testing of backend logic.
3.  **Frontend Debugging**: Use browser developer tools (React DevTools, Network tab) to inspect component states, Convex query responses, and identify rendering issues.
4.  **Convex Dev CLI**: Use `npx convex dev` to run your Convex backend locally and `npx convex deploy` to push changes to production.
5.  **Authentication Simulation**: When testing secured Convex functions, ensure you're logged in via Clerk or mock authentication for local development.

## Environment Variables

Ensure these environment variables are configured in your `.env.local` (for development) and Convex dashboard (for deployment).

```dotenv
# .env.local
NEXT_PUBLIC_CONVEX_URL="YOUR_CONVEX_DEPLOYMENT_URL"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="YOUR_CLERK_PUBLISHABLE_KEY"
CLERK_SECRET_KEY="YOUR_CLERK_SECRET_KEY"

# For Convex backend (if scraper interacts with a secure Convex action or mutation)
# These are typically set in the Convex dashboard's environment variables
# For example, if your scraper needs an API key to call a Convex action
# CONVEX_SCRAPER_API_KEY="a_secure_key_for_scraper_auth"
```

**CRITICAL**: `CONVEX_URL` and `CLERK_PUBLISHABLE_KEY` are `NEXT_PUBLIC_` prefixed for client-side access. `CLERK_SECRET_KEY` is server-side only. Any sensitive keys used by Convex actions/mutations should be set directly in the Convex dashboard's environment variables, *not* in `.env.local` if they are not client-exposed.

## Success Metrics

*   **Convex Schema Deployed**: `performance_metrics` table with appropriate indexes is correctly defined in Convex.
*   **Scraper Integration**: Scraper successfully ingests data into the `performance_metrics` table via the `addPerformanceMetrics` mutation, visible in the Convex dashboard.
*   **Aggregated Metrics Display**: Dashboard accurately displays aggregated metrics (views, likes, comments, shares, engagement rate, CPM) in real-time cards, respecting date range and platform filters.
*   **Time-Series Chart Functionality**: The interactive line chart correctly renders metrics over time, with dual axes and smooth animations, responding to date range and platform filters.
*   **Authentication**: Only authenticated users (via Clerk) can access campaign analytics data.
*   **Real-time Updates**: Changes to `performance_metrics` (e.g., new data from scraper) are immediately reflected in the dashboard without manual refresh.
*   **Performance**: Queries for dashboard data (both aggregated and time-series) execute efficiently, even with increasing data volumes.
*   **Error Handling**: The dashboard gracefully handles cases where data is unavailable or an error occurs during data fetching.