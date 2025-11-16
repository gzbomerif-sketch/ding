---
name: agent-convex-influencer-rankings
description: Implements Influencer Rankings feature using Convex for backend logic and data aggregation.
model: inherit
color: purple
---


# Agent: Influencer Rankings Implementation with Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for implementing an "Influencer Rankings" feature. It details the backend logic using Convex queries and actions, frontend integration with Next.js, and secure authentication with Clerk, ensuring efficient data aggregation and real-time updates for an influencer roster display.
**Tech Stack**: Next.js (React), Convex (Backend, Database, Real-time), Clerk (Authentication), TypeScript.
**Source**: Convex Developer Hub, Clerk Documentation, Stack by Convex articles, Convex YouTube tutorials.

## Critical Implementation Knowledge
### 1. Convex Latest Updates 🚨
Convex is continuously evolving. Key considerations:
*   **Aggregation Strategy**: Convex explicitly does not provide native `COUNT` or `SUM` directly within queries for scalability reasons. Instead, developers must manage aggregations manually, use the `@convex-dev/aggregate` component, or perform aggregation within Convex Actions. This feature requires careful aggregation, so leverage the Action pattern for dynamic date ranges and metrics.
*   **Indexes**: For efficient filtering and sorting, especially on large tables (1000+ documents), always define and use indexes (`withIndex`) in your schema. Relying on `.filter()` or in-code filtering on large datasets can lead to performance issues and full table scans.
*   **Next.js App Router & Providers**: When integrating Clerk and Convex with Next.js App Router, `ConvexProviderWithClerk` (a Client Component) requires a separate wrapper Client Component if used within a Server Component like `app/layout.tsx`.

### 2. Common Pitfalls & Solutions 🚨
*   **Inefficient Aggregation**:
    *   **Pitfall**: Attempting `COUNT` or `SUM` directly in a Convex query by `collect()`ing all documents and then iterating. This can be slow, consume excessive bandwidth, and lead to query timeouts for large datasets.
    *   **Solution**: For dynamic, complex aggregations over varying date ranges, implement a **Convex Action**. This allows for fetching relevant documents (using indexes), performing in-memory calculations (counts, sums, CPM), and then returning the aggregated, sorted, and paginated results. For static or less frequently changing aggregates, consider pre-aggregating data into a separate table via mutations/actions or using the `@convex-dev/aggregate` component.
*   **Lack of Indexes**:
    *   **Pitfall**: Queries becoming slow as data grows because they perform full table scans.
    *   **Solution**: Define appropriate indexes in `convex/schema.ts` for all fields used in filtering (`q.eq`, `q.gt`, `q.lt`) and sorting.
*   **Incorrect Clerk/Convex Provider Setup**:
    *   **Pitfall**: `useConvexAuth()` returning `isAuthenticated: false` despite successful Clerk login.
    *   **Solution**: Ensure `ClerkProvider` wraps `ConvexProviderWithClerk` and that `CLERK_JWT_ISSUER_DOMAIN` is correctly configured in your Convex `auth.config.ts` and `.env` file. After changing auth config, run `npx convex dev` or `npx convex deploy`.
*   **Missing Access Control**:
    *   **Pitfall**: Public Convex functions exposing sensitive data to unauthenticated users.
    *   **Solution**: Implement `ctx.auth.getUserIdentity()` checks at the beginning of all public queries and actions that require user authentication.

### 3. Best Practices 🚨
*   **Schema Design**: Define clear and well-indexed schemas for `profiles`, `posts`, and `performance_metrics`. Consider compound indexes for common query patterns (e.g., `['influencerId', 'postedAt']` for posts).
*   **Convex Actions for Heavy Logic**: Utilize Convex Actions for complex computations, external API calls, and heavy data transformations that might exceed query limitations or are not easily reactive. This is ideal for dynamic ranking calculations.
*   **Real-time with Queries**: Leverage Convex Queries for displaying individual influencer profiles or pre-aggregated data, benefiting from Convex's automatic real-time updates.
*   **Authentication Flow**: Use `useConvexAuth()` from `convex/react-clerk` in your frontend components to manage authentication state and conditionally render UI or fetch data, ensuring tokens are ready for backend calls.
*   **Environment Variables**: Manage sensitive keys and URLs (Clerk keys, Convex deployment URL) securely using environment variables.

## Implementation Steps

### Backend Implementation
The core logic for Influencer Rankings will reside in Convex backend functions. We'll use a Convex Query for basic profile retrieval and a Convex Action for the dynamic aggregation and ranking logic to handle flexible date ranges and sorting efficiently.

#### 1. Define Convex Schema
Create `convex/schema.ts` to define your tables and indexes.

#### 2. Implement Convex Action for Rankings
Create `convex/influencerRankings.ts` to house the `getRankings` action. This action will be responsible for:
*   Receiving `startDate`, `endDate`, `sortBy`, `sortOrder`, `limit`, `offset`.
*   Fetching `profiles`.
*   Querying `posts` and `performance_metrics` within the specified date range using appropriate indexes.
*   Performing in-memory calculations for:
    *   `count` of videos posted per influencer.
    *   `sum` of total views per influencer.
    *   Calculating `CPM` per influencer.
    *   Calculating `payment per video`.
*   Combining all metrics with profile data.
*   Sorting the combined data.
*   Applying pagination.
*   Identifying the top performer.

#### 3. Implement Convex Query for Base Profile Data (Optional, for detail views)
Create `convex/profiles.ts` for a simple `getProfileById` query, retrieving individual influencer details efficiently.

#### 4. Configure Authentication
Update `convex/auth.config.ts` with your Clerk JWT issuer domain.

### Frontend Integration
The Next.js frontend will consume the Convex functions using `useQuery` hooks.

#### 1. Configure Convex & Clerk Providers
Set up `ConvexProviderWithClerk` in a Client Component wrapper within your `app/layout.tsx` to handle authentication context.

#### 2. Create Rankings Component
Develop a React component (e.g., `InfluencerRankingsTable.tsx`) that:
*   Uses `useConvexAuth()` to ensure the user is authenticated.
*   Manages state for `startDate`, `endDate`, `sortBy`, `sortOrder`, `currentPage`, `itemsPerPage`.
*   Calls `useQuery` with `api.influencerRankings.getRankings` (or `api.influencerRankings.getRankingsAction` if exposed as an action via `api.ts`).
*   Displays the data in a sortable, paginated table with animated transitions.
*   Highlights the top performer.

## Code Patterns

### Convex Backend Functions
1.  **`convex/schema.ts` (Schema Definition)**:

    ```typescript
    import { defineSchema, defineTable } from "convex/server";
    import { v } from "convex/values";

    export default defineSchema({
      profiles: defineTable({
        clerkUserId: v.string(),
        username: v.string(),
        profilePictureUrl: v.string(),
        paymentPerVideo: v.number(),
        // Add other profile fields as needed
      }).index("by_clerkUserId", ["clerkUserId"]),

      posts: defineTable({
        influencerId: v.id("profiles"),
        campaignId: v.id("campaigns"), // Assuming a campaigns table exists
        videoUrl: v.string(),
        postedAt: v.number(), // Unix timestamp
        // Add other post fields
      }).index("by_influencerId_postedAt", ["influencerId", "postedAt"]),

      performance_metrics: defineTable({
        postId: v.id("posts"),
        views: v.number(),
        cpm: v.number(), // CPM specific to this post
        // Add other metrics
      }).index("by_postId", ["postId"]),

      // Optional: pre-aggregated data table if needed for very high-frequency reads or simpler queries
      // influencer_daily_metrics: defineTable({
      //   influencerId: v.id("profiles"),
      //   date: v.string(), // YYYY-MM-DD
      //   totalVideos: v.number(),
      //   totalViews: v.number(),
      //   totalCPM: v.number(), // Sum of individual post CPMs or recalculated
      // }).index("by_influencerId_date", ["influencerId", "date"]),
    });
    ```

2.  **`convex/influencerRankings.ts` (Action for Rankings Aggregation)**:

    ```typescript
    import { action } from "./_generated/server";
    import { v } from "convex/values";

    export const getRankings = action({
      args: {
        startDate: v.number(), // Unix timestamp
        endDate: v.number(),   // Unix timestamp
        sortBy: v.string(),    // e.g., 'totalViews', 'paymentPerVideo', 'cpm'
        sortOrder: v.union(v.literal("asc"), v.literal("desc")),
        limit: v.number(),
        offset: v.number(),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Unauthorized: Must be logged in.");
        }

        // Fetch all profiles
        const profiles = await ctx.db.query("profiles").collect();

        const influencerData = [];

        for (const profile of profiles) {
          let totalViews = 0;
          let videoCount = 0;
          let totalCpmValue = 0; // Sum of CPM * (views/1000) for calculation

          // Fetch posts for the current influencer within the date range
          const posts = await ctx.db
            .query("posts")
            .withIndex("by_influencerId_postedAt", (q) =>
              q.eq("influencerId", profile._id).gte("postedAt", args.startDate).lte("postedAt", args.endDate)
            )
            .collect();

          for (const post of posts) {
            videoCount++;
            // Fetch performance metrics for each post
            const metrics = await ctx.db
              .query("performance_metrics")
              .withIndex("by_postId", (q) => q.eq("postId", post._id))
              .unique();

            if (metrics) {
              totalViews += metrics.views;
              // Assuming CPM is already a rate (e.g., per 1000 views)
              // We'll sum up actual CPM earnings for the period.
              totalCpmValue += (metrics.cpm * metrics.views) / 1000;
            }
          }

          const cpmPerInfluencer = totalViews > 0 ? (totalCpmValue / totalViews) * 1000 : 0; // Recalculate average CPM for the influencer

          influencerData.push({
            _id: profile._id,
            profilePictureUrl: profile.profilePictureUrl,
            username: profile.username,
            paymentPerVideo: profile.paymentPerVideo,
            videoCount: videoCount,
            totalViews: totalViews,
            cpmPerInfluencer: cpmPerInfluencer,
            // Add other computed metrics
          });
        }

        // Sort the data
        influencerData.sort((a, b) => {
          const aValue = a[args.sortBy as keyof typeof a] as number; // Type assertion
          const bValue = b[args.sortBy as keyof typeof b] as number; // Type assertion

          if (args.sortOrder === "asc") {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        });

        // Identify top performer (after sorting, if 'desc', it's the first)
        const topPerformer = influencerData.length > 0 ? influencerData[0] : null;

        // Apply pagination
        const paginatedData = influencerData.slice(args.offset, args.offset + args.limit);

        return {
          rankings: paginatedData.map(data => ({
            ...data,
            isTopPerformer: topPerformer && data._id === topPerformer._id
          })),
          total: influencerData.length,
          topPerformer: topPerformer ? { _id: topPerformer._id, username: topPerformer.username } : null
        };
      },
    });
    ```

3.  **`convex/profiles.ts` (Query for single profile)**:

    ```typescript
    import { query } from "./_generated/server";
    import { v } from "convex/values";

    export const getProfileById = query({
      args: {
        profileId: v.id("profiles"),
      },
      handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
          throw new Error("Unauthorized: Must be logged in.");
        }
        // Example access control: ensure user can only view their own profile or is an admin
        // const user = await ctx.db.query("users").withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject)).unique();
        // if (user?.role !== "admin" && profileId is not related to current user) {
        //   throw new Error("Forbidden: Not authorized to view this profile.");
        // }

        return ctx.db.get(args.profileId);
      },
    });
    ```

### Frontend Integration (Conceptual)

```typescript jsx
// components/InfluencerRankingsTable.tsx
"use client"; // This is a Client Component

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useConvexAuth } from "@convex-dev/react-clerk";

const InfluencerRankingsTable = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [startDate, setStartDate] = useState(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const [endDate, setEndDate] = useState(Date.now());
  const [sortBy, setSortBy] = useState("totalViews");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);

  const { data: rankingsData, isLoading: isRankingsLoading } = useQuery(
    api.influencerRankings.getRankings,
    isAuthenticated
      ? {
          startDate,
          endDate,
          sortBy,
          sortOrder,
          limit,
          offset,
        }
      : "skip"
  );

  if (isLoading) return <div>Loading authentication...</div>;
  if (!isAuthenticated) return <div>Please log in to view influencer rankings.</div>;

  if (isRankingsLoading) return <div>Loading rankings...</div>;
  if (!rankingsData) return <div>No rankings available.</div>;

  const { rankings, total, topPerformer } = rankingsData;

  return (
    <div>
      <h1>Influencer Rankings</h1>
      {/* Date range pickers, sort controls, pagination controls */}
      {/* Example:
      <input type="date" value={new Date(startDate).toISOString().split('T')[0]} onChange={(e) => setStartDate(new Date(e.target.value).getTime())} />
      <input type="date" value={new Date(endDate).toISOString().split('T')[0]} onChange={(e) => setEndDate(new Date(e.target.value).getTime())} />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="totalViews">Total Views</option>
        <option value="cpmPerInfluencer">CPM</option>
        <option value="videoCount">Videos Posted</option>
        <option value="paymentPerVideo">Payment/Video</option>
      </select>
      <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
        Sort {sortOrder === 'asc' ? 'Asc' : 'Desc'}
      </button>
      */}

      <table>
        <thead>
          <tr>
            <th>Profile Picture</th>
            <th>Username</th>
            <th onClick={() => setSortBy('paymentPerVideo')}>Payment/Video</th>
            <th onClick={() => setSortBy('videoCount')}>Videos Posted</th>
            <th onClick={() => setSortBy('totalViews')}>Total Views</th>
            <th onClick={() => setSortBy('cpmPerInfluencer')}>CPM</th>
            <th>Rank</th> {/* You might calculate rank on frontend or within action */}
          </tr>
        </thead>
        <tbody>
          {rankings.map((influencer, index) => (
            <tr key={influencer._id} className={influencer.isTopPerformer ? "highlight-top-performer" : ""}>
              <td><img src={influencer.profilePictureUrl} alt={influencer.username} width="50" height="50" /></td>
              <td>{influencer.username} {influencer.isTopPerformer && "(Top Performer)"}</td>
              <td>${influencer.paymentPerVideo.toFixed(2)}</td>
              <td>{influencer.videoCount}</td>
              <td>{influencer.totalViews.toLocaleString()}</td>
              <td>${influencer.cpmPerInfluencer.toFixed(2)}</td>
              <td>{offset + index + 1}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Pagination controls */}
      {/* <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0}>Previous</button>
      <span>Page {offset / limit + 1} of {Math.ceil(total / limit)}</span>
      <button onClick={() => setOffset(Math.min(total - limit, offset + limit))} disabled={offset + limit >= total}>Next</button> */}
    </div>
  );
};

export default InfluencerRankingsTable;
```

## Testing & Debugging
*   **Convex Dashboard**: Use the Convex dashboard (`dashboard.convex.dev`) to:
    *   Inspect `profiles`, `posts`, `performance_metrics` tables for correct data entry.
    *   Test `api.influencerRankings.getRankings` action directly with various `startDate`, `endDate`, `sortBy` parameters. Check the logs for execution time and any errors.
    *   Verify `auth.config.ts` is synced and `CLERK_JWT_ISSUER_DOMAIN` is correct.
*   **Local Development**: Run `npx convex dev` to get real-time feedback and logs in your terminal.
*   **Browser Developer Tools**:
    *   Network tab: Monitor calls to Convex backend for errors, request/response payloads, and performance.
    *   React Dev Tools: Inspect component state (e.g., `startDate`, `endDate`, `sortBy`) and `useQuery` data.
*   **Authentication Debugging**: If `isAuthenticated` is `false` unexpectedly, check browser console for Clerk errors, ensure environment variables are loaded, and verify Convex backend auth configuration.

## Environment Variables
Ensure these variables are set in your `.env.local` file for local development and in your deployment environment.

```
# Clerk Frontend API Key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_YOUR_CLERK_PUBLISHABLE_KEY

# Clerk Backend Secret Key
CLERK_SECRET_KEY=sk_live_YOUR_CLERK_SECRET_KEY

# Convex Deployment URL (usually automatically managed by Convex CLI)
NEXT_PUBLIC_CONVEX_URL=https://<your-project-name>.convex.cloud

# Clerk JWT Issuer Domain for Convex backend validation
CLERK_JWT_ISSUER_DOMAIN=https://<your-clerk-domain>.clerk.accounts.dev
```

## Success Metrics
*   **Influencer Roster Display**: The frontend displays a list of influencers with profile picture, username, payment per video, number of videos posted, total views, and CPM per influencer.
*   **Sortable Columns**: Users can click on column headers (e.g., Total Views, CPM) to sort the roster in ascending or descending order.
*   **Date Range Filtering**: The rankings accurately reflect data for the selected date range, with dynamic updates.
*   **Top Performer Highlight**: The influencer with the highest metric (based on current sort criteria) is clearly highlighted.
*   **Real-time Updates**: Changes to underlying `posts` or `performance_metrics` (if using an event-driven pre-aggregation strategy) or `profiles` data are reflected automatically in the UI without manual refresh.
*   **Authentication**: Only authenticated users can view the rankings. `ctx.auth.getUserIdentity()` successfully retrieves user identity in Convex functions.
*   **Performance**: The ranking calculations and display load within acceptable timeframes, even with a growing number of influencers and posts, leveraging indexes and Convex Actions effectively.
*   **Error Handling**: Appropriate error messages are displayed for network issues, unauthorized access, or data loading failures.