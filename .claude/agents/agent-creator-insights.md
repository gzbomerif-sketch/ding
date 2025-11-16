---
name: agent-CustomAPI-CreatorInsights
description: Implements Creator Insights using a hypothetical Custom API, Convex, and Next.js.
model: inherit
color: purple
---


# Agent: Creator Insights Implementation with Custom API

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for integrating a hypothetical external "Custom API" to power a "Creator Insights" feature within a Next.js application, utilizing Convex for backend logic and data persistence, and Clerk for authentication. It focuses on architectural patterns, Convex best practices, and common integration pitfalls for external APIs.
**Tech Stack**: Next.js, React, Convex (Backend, Database, Realtime), Clerk (Authentication), Custom API (External Creator Data Provider).
**Source**: This guide synthesizes general best practices for API integration, Convex documentation patterns for external calls, and common industry standards for influencer/creator data APIs.

## Critical Implementation Knowledge
Given the "Custom API" is hypothetical, we assume it's a typical RESTful API providing data relevant to creators, campaigns, and performance metrics.

### 1. External API Integration in Convex 🚨
Convex `actions` are the *only* appropriate place to make external HTTP requests to third-party APIs. They run in a Node.js environment, allowing standard HTTP clients (like `node-fetch` or `axios`). `mutations` and `queries` run in a V8 isolate and cannot make external network calls directly.

*   **API Keys/Authentication**: Store API keys as Convex environment variables (e.g., `CONVEX_CUSTOM_API_KEY`). Access them within actions using `process.env.CONVEX_CUSTOM_API_KEY`. Never expose these directly to the frontend.
*   **Data Transformation**: Actions should transform raw API responses into a format suitable for your Convex database schema before passing to a mutation or returning to the client.
*   **Error Handling**: Implement robust `try...catch` blocks within actions to handle network errors, API rate limits, and unexpected responses gracefully.

### 2. Common Pitfalls & Solutions 🚨

*   **Calling External APIs from Mutations/Queries**:
    *   **Pitfall**: Attempting `fetch` or `axios` calls directly from `mutations` or `queries`. This will result in runtime errors as these environments are sandboxed.
    *   **Solution**: *Always* use `actions` for any external API interaction. If a query needs external data, it must first be fetched by an action, potentially cached by a mutation, and then queried.
*   **Exposing API Keys**:
    *   **Pitfall**: Hardcoding API keys in frontend code or passing them directly from the frontend to Convex functions.
    *   **Solution**: Store API keys as environment variables in Convex and access them *only* within your Convex actions.
*   **Lack of Caching for External Data**:
    *   **Pitfall**: Repeatedly calling a slow or rate-limited external API for the same data.
    *   **Solution**: Implement caching strategies. After an action fetches data, use a `mutation` to store it in your Convex database. Queries can then read the cached data, significantly improving performance and reducing external API calls.
*   **Insufficient Error Handling**:
    *   **Pitfall**: Not anticipating API downtime, rate limits, or malformed responses, leading to brittle features.
    *   **Solution**: Use `try...catch` blocks. Implement retry logic (with exponential backoff) for transient errors. Parse API error messages and return meaningful errors to the client.
*   **Next.js Hydration Mismatches**:
    *   **Pitfall**: Client-side rendering of data fetched from Convex resulting in different UI than server-side rendering, especially with Clerk authentication causing `useQuery` to initially return `undefined`.
    *   **Solution**: Ensure your Convex `useQuery` calls are handled gracefully during loading states. Use optional chaining (`data?.field`) and display loading spinners or skeletons while data is being fetched.

### 3. Best Practices 🚨

*   **Idempotency**: When using `mutations` to store data fetched from an external API, ensure your mutations can be called multiple times with the same input without causing unintended side effects (e.g., duplicate entries). Use unique identifiers (like the external API's ID) as Convex document IDs or unique indexes.
*   **Separate Concerns**: Keep your Convex `actions` focused on interacting with the external API and `mutations` focused on interacting with your Convex database.
*   **Typed API Responses**: Use TypeScript interfaces to define the expected shape of your external API responses and Convex data models. This improves code clarity and reduces errors.
*   **Batching/Debouncing**: If the feature requires fetching data for many creators, consider batching API requests within an action or debouncing frontend calls to reduce the load on both your Convex backend and the external API.
*   **Security Context**: Use `ctx.auth.getUserIdentity()` within your Convex actions/mutations/queries to ensure that requests are made by authenticated users, especially when interacting with personalized creator data.

## Implementation Steps

1.  **Define Custom API Schema**: Hypothesize the API endpoints and response structures for creator rankings, performance metrics, and inspirational content.
2.  **Convex Environment Variables**: Set up `CONVEX_CUSTOM_API_KEY` for secure access.
3.  **Convex Actions for API Calls**: Write `action` functions to encapsulate all HTTP requests to the Custom API.
4.  **Convex Mutations for Data Storage**: Create `mutation` functions to store or update fetched data from the Custom API into your Convex database. Implement caching.
5.  **Convex Queries for Data Retrieval**: Develop `query` functions to read processed and cached creator insights data from Convex for the frontend.
6.  **Next.js Frontend Integration**: Integrate `useAction`, `useMutation`, and `useQuery` hooks in your React components to display creator insights.
7.  **Clerk Authentication**: Ensure all Convex calls are made by authenticated users, and handle loading states related to Clerk.

### Backend Implementation
The backend logic for Creator Insights will primarily reside within Convex functions, leveraging `actions` for external API interaction and `mutations` for database writes, with `queries` serving data to the frontend.

#### Convex Functions (Primary)

1.  **`actions/creatorInsights.ts`**:
    *   `fetchCreatorRankings(campaignId: string)`: Calls the Custom API to get creator rankings for a given campaign.
    *   `fetchCreatorPerformance(creatorId: string)`: Calls the Custom API for detailed performance metrics for a specific creator.
    *   `fetchInspirationVideos(filters: { by: 'views' | 'engagement' | 'recent' })`: Calls the Custom API for inspirational video examples.
    *   *Role*: Performs HTTP requests, handles API authentication, rate limiting, and initial data parsing.
2.  **`mutations/creatorInsights.ts`**:
    *   `storeCreatorRankings(rankingsData: any[])`: Persists or updates campaign rankings data fetched by an action into a `creatorRankings` table.
    *   `upsertCreatorPerformance(performanceData: any)`: Stores or updates individual creator performance metrics in a `creatorPerformance` table.
    *   `upsertInspirationVideo(videoData: any)`: Stores or updates inspirational video details in an `inspirationVideos` table.
    *   *Role*: Writes/updates data to Convex DB, implements caching and idempotency.
3.  **`queries/creatorInsights.ts`**:
    *   `getCampaignRankings(campaignId: string)`: Retrieves cached creator rankings from the `creatorRankings` table.
    *   `getCreatorDetails(creatorId: string)`: Fetches combined data for a creator (from `creatorPerformance` and potentially other tables).
    *   `getInspirationVideos(filters: any)`: Retrieves inspirational video data.
    *   *Role*: Reads data from Convex DB, provides real-time updates to the frontend.

### Frontend Integration
Next.js components will interact with Convex using the provided hooks.

1.  **`pages/campaigns/[id]/insights.tsx`**: A page to display campaign-specific creator rankings.
    *   Uses `useQuery(api.creatorInsights.getCampaignRankings, { campaignId })`.
    *   May trigger `useAction(api.creatorInsights.fetchCreatorRankings)` followed by `useMutation(api.creatorInsights.storeCreatorRankings)` if data is not fresh or available.
2.  **`components/CreatorCard.tsx`**: Displays individual creator performance details.
    *   Uses `useQuery(api.creatorInsights.getCreatorDetails, { creatorId })`.
3.  **`components/InspirationFeed.tsx`**: Shows a feed of inspirational videos.
    *   Uses `useQuery(api.creatorInsights.getInspirationVideos, { filters })`.
4.  **Loading and Error States**: Implement robust UI states for data fetching, loading, and errors.
5.  **Authentication Guard**: Use Clerk's `useUser` or `withClerkAuth` to ensure users are authenticated before fetching sensitive data.

## Code Patterns

### Convex Backend Functions

```typescript
// convex/actions/creatorInsights.ts
import { action } from './_generated/server';
import { api } from './_generated/api'; // For calling mutations from actions
import { v } from 'convex/values';

export const fetchCreatorRankings = action({
  args: { campaignId: v.string() },
  handler: async (ctx, { campaignId }) => {
    // 1. Authenticate the user accessing this action (optional, but good practice)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // 2. Fetch data from the Custom API
    const CUSTOM_API_BASE_URL = process.env.CUSTOM_API_BASE_URL; // e.g., 'https://api.custom-insights.com'
    const CUSTOM_API_KEY = process.env.CONVEX_CUSTOM_API_KEY;

    if (!CUSTOM_API_BASE_URL || !CUSTOM_API_KEY) {
      throw new Error('Custom API environment variables not set');
    }

    try {
      const response = await fetch(`${CUSTOM_API_BASE_URL}/campaigns/${campaignId}/rankings`, {
        headers: {
          'Authorization': `Bearer ${CUSTOM_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Custom API error: ${response.status} - ${errorBody}`);
        throw new Error(`Failed to fetch rankings: ${response.statusText}`);
      }

      const rawRankings = await response.json();

      // 3. Transform data and trigger a mutation to store it
      const processedRankings = rawRankings.map((item: any) => ({
        creatorId: item.creator_id,
        campaignId: campaignId,
        rank: item.rank,
        totalViews: item.total_views,
        engagementRate: item.engagement_rate,
        videoCount: item.video_count,
        // ... any other relevant data
        lastFetched: Date.now(),
      }));

      // Call a mutation to store/update the data in Convex
      await ctx.runMutation(api.creatorInsights.storeCreatorRankings, {
        campaignId,
        rankings: processedRankings,
      });

      return processedRankings; // Return processed data to the frontend
    } catch (error) {
      console.error('Error in fetchCreatorRankings action:', error);
      throw new Error(`Could not retrieve creator rankings: ${(error as Error).message}`);
    }
  },
});

// convex/mutations/creatorInsights.ts
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const storeCreatorRankings = mutation({
  args: {
    campaignId: v.string(),
    rankings: v.array(v.object({
      creatorId: v.string(),
      campaignId: v.string(),
      rank: v.number(),
      totalViews: v.number(),
      engagementRate: v.number(),
      videoCount: v.number(),
      lastFetched: v.number(),
    })),
  },
  handler: async (ctx, { campaignId, rankings }) => {
    // Ensure the user is authenticated (if this mutation is user-triggered)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized');
    }

    // For idempotency: delete existing rankings for this campaign before inserting new ones
    // Or, more robustly, iterate and upsert based on a unique key (e.g., creatorId + campaignId)
    const existingRankings = await ctx.db
      .query('creatorRankings')
      .withIndex('by_campaignId', (q) => q.eq('campaignId', campaignId))
      .collect();

    for (const ranking of rankings) {
      const existing = existingRankings.find(r => r.creatorId === ranking.creatorId);
      if (existing) {
        await ctx.db.patch(existing._id, ranking);
      } else {
        await ctx.db.insert('creatorRankings', ranking);
      }
    }
  },
});

// convex/queries/creatorInsights.ts
import { query } from './_generated/server';
import { v } from 'convex/values';

export const getCampaignRankings = query({
  args: { campaignId: v.string() },
  handler: async (ctx, { campaignId }) => {
    // Optional: Authenticate the user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return null or throw an error depending on desired behavior for unauthenticated access
      return null;
    }

    // Retrieve rankings from the Convex database
    return await ctx.db
      .query('creatorRankings')
      .withIndex('by_campaignId', (q) => q.eq('campaignId', campaignId))
      .collect();
  },
});
```

## Testing & Debugging

1.  **Convex Dev Console**: Use the Convex dashboard (`npx convex dev`) to inspect database state, view logs from actions/mutations/queries, and manually call functions for testing.
2.  **Unit Testing Actions**: For actions interacting with external APIs, consider mocking the `fetch` API during local testing to simulate different API responses (success, error, rate limit).
3.  **Frontend Loading/Error States**: Manually test components with different states (loading, error, empty data) by simulating delays or errors in your Convex functions or using local state.
4.  **Clerk Authentication**: Ensure your application correctly handles authenticated vs. unauthenticated users for accessing creator insights. Use Clerk's debugging tools.
5.  **Rate Limiting**: If the Custom API has rate limits, test how your Convex action handles them. Implement logging for 429 errors.
6.  **Data Consistency**: Verify that data fetched by actions and stored by mutations is consistent and correctly structured in the Convex database.

## Environment Variables

```bash
# .env.local and .env (for Convex deployment)

# Convex Deployment
# Required by Convex CLI for deployment and local development
CONVEX_DEPLOYMENT_URL="YOUR_CONVEX_DEPLOYMENT_URL"

# Clerk Authentication (if using Clerk for your app's auth)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# Custom API Integration (for Convex Actions)
CUSTOM_API_BASE_URL="https://api.example.com/v1"
CONVEX_CUSTOM_API_KEY="your_secure_custom_api_key_here" # Store securely in Convex env vars
```

## Success Metrics

*   [ ] `fetchCreatorRankings` action successfully calls the Custom API and returns data.
*   [ ] `storeCreatorRankings` mutation correctly stores/updates data in the `creatorRankings` Convex table.
*   [ ] `getCampaignRankings` query retrieves the stored data accurately and in real-time.
*   [ ] Frontend components display campaign rankings, creator details, and inspiration videos correctly.
*   [ ] Loading and error states are handled gracefully in the UI.
*   [ ] Clerk authentication correctly gates access to creator insights features.
*   [ ] No sensitive API keys are exposed to the frontend.
*   [ ] Data is refreshed from the Custom API (via action and mutation) when appropriate, and cached data is served for optimal performance.