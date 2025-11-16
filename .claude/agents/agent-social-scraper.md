---
name: agent-custom-social-scraper
description: Implements a social scraper integration with a custom backend service using Convex
model: inherit
color: purple
---


# Agent: Social Scraper Implementation with Custom API and Convex

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for integrating a custom-built social scraper service (running on a VPS with Playwright/Docker) with a Next.js frontend, Convex backend, and Clerk for authentication. It focuses on leveraging Convex actions, mutations, and queries for efficient and scalable asynchronous data processing.
**Tech Stack**: Next.js, React, Convex, Clerk, TypeScript, Custom Social Scraper (Playwright, Docker, VPS, R2 Storage).
**Source**: This guide is based on architectural patterns for integrating custom external services with Convex, as there isn't a single "Custom API" documentation.

## Critical Implementation Knowledge

### 1. Custom Social Scraper API Design 🚨
The "Custom API" refers to the web interface exposed by your VPS-hosted social scraper service. It must be designed for asynchronous operations.

*   **Initiate Scrape Endpoint**: A `POST` endpoint (e.g., `/api/scrape-profile`) that accepts parameters like `profileUrl` and `platform`. This endpoint should immediately return a `jobId` or similar identifier, indicating the scrape has been queued. It should *not* wait for the scrape to complete.
*   **Webhook Callback Endpoint**: The scraper service should be configured to send a `POST` request to a specific Convex Action URL (configured as a webhook) upon completion of a scrape job. This webhook payload will contain the scraped data and the `jobId`. This is crucial for handling long-running scrapes without blocking Convex Actions.
*   **Authentication**: The custom scraper service's API should be secured, ideally with a shared secret or API key that Convex can use when making requests. The webhook callback from the scraper to Convex should also include a shared secret for Convex to validate the origin.
*   **Idempotency**: Design the scraper's initiation and the Convex data saving mutations to be idempotent. If a webhook is sent twice, it shouldn't create duplicate entries.
*   **Error Handling**: The scraper service needs robust internal error handling (as described in the feature context). The webhook payload should include status information (success/failure) and any error details.

### 2. Common Pitfalls & Solutions 🚨

*   **Convex Action Timeout**: Convex Actions have a default timeout (e.g., 60 seconds). If your `initiateScrape` action waits for the actual scrape to complete, it *will* time out.
    *   **Solution**: Always design the Convex Action to simply *trigger* the scrape and return immediately. The scraper service then *pushes* results back to a separate Convex Action via a webhook.
*   **Securing Webhooks**: Exposing a Convex Action as a public webhook endpoint requires security.
    *   **Solution**: Implement a shared secret or token in the webhook payload, which the Convex Action validates against an environment variable.
*   **Large Data Payloads**: Scraped data (especially images and many posts) can be large.
    *   **Solution**: Store compressed screenshots (<100KB) in R2 and only store the R2 URL in Convex. For other data, ensure the payload size is within Convex limits for action/mutation arguments. If data is excessively large, consider splitting it or using Convex File Storage for larger binary blobs.
*   **Race Conditions/Duplicate Data**: If webhooks are retried or sent multiple times.
    *   **Solution**: Use a unique identifier (like a `jobId` from the scraper) and ensure Convex mutations `patch` existing data or `insert` only if a unique constraint isn't met.
*   **Environment Variable Management**: Incorrectly handling secrets.
    *   **Solution**: Store all secrets (scraper API key, webhook secret) securely as Convex environment variables. Never commit them to source control.

### 3. Best Practices 🚨

*   **Asynchronous Flow is Key**: For external, potentially long-running operations like scraping, always use an asynchronous, webhook-driven pattern. A Convex Action triggers the job, and a separate Convex Action receives the results.
*   **Convex Actions for External Calls**: `Convex Actions` are the correct place for all `fetch` requests to your custom scraper service. They run on the server and can securely access environment variables.
*   **Convex Mutations for Database Writes**: All data persistence (saving scraped profiles, posts, updating job status) must be done through `Convex Mutations`.
*   **Convex Queries for Data Reads**: All data retrieval for the frontend should use `Convex Queries` to leverage real-time subscriptions and efficient data fetching.
*   **Robust Error Logging**: Ensure both the custom scraper service and your Convex Actions/Mutations log errors comprehensively for debugging.
*   **Schema Validation**: Always validate incoming data in your Convex Mutations, especially from external sources like webhooks, to prevent invalid data from entering your database.

## Implementation Steps

1.  **Design Custom Scraper API**: Define the `initiate-scrape` endpoint and the `webhook-callback` payload structure for your VPS-hosted scraper. Implement authentication.
2.  **Convex Schema Definition**: Define the database schema for `profiles`, `posts`, and potentially `scrapeJobs` tables in Convex.
3.  **Convex Backend Functions**: Implement `Convex Actions` to interact with the scraper, and `Convex Mutations` to persist data.
4.  **Frontend Integration**: Develop Next.js components to trigger scrapes and display fetched data.
5.  **Environment Variables**: Configure all necessary API keys and URLs.
6.  **Deployment**: Deploy the Convex backend and Next.js frontend.

### Backend Implementation (Convex)

#### Convex Functions (Primary)

1.  **`actions/scrape.ts`**:
    *   `initiateScrape(profileUrl: string, platform: 'instagram' | 'tiktok')`: This `Convex Action` will make an HTTP `POST` request to your custom scraper service's `/api/scrape-profile` endpoint. It will pass the `profileUrl`, `platform`, and an API key for authentication. It should return immediately with a `jobId` from the scraper.
    *   `receiveScrapeWebhook(payload: ScraperWebhookPayload)`: This `Convex Action` will serve as the webhook endpoint for your custom scraper. It will validate a shared secret in the payload (or header), then trigger a `Convex Mutation` (e.g., `saveScrapedData`) to persist the data. It should respond quickly to the webhook.

2.  **`mutations/profiles.ts`**:
    *   `saveScrapedData(jobId: string, data: ScrapedProfileData, posts: ScrapedPostData[])`: This `Convex Mutation` will receive the validated scraped data from the `receiveScrapeWebhook` action. It will save/update profile information and associated posts in your Convex database. It must handle idempotency (e.g., update if profile exists, insert if new).
    *   `updateScrapeJobStatus(jobId: string, status: 'pending' | 'completed' | 'failed', error?: string)`: A mutation to update the status of the scrape job, useful for tracking in the UI.

3.  **`queries/profiles.ts`**:
    *   `getProfileByUsername(username: string, platform: 'instagram' | 'tiktok')`: A `Convex Query` to fetch the latest scraped profile data and posts for a given username and platform, providing real-time updates to the frontend.
    *   `getRecentScrapeJobs()`: A `Convex Query` to show a list of recent scrape jobs and their statuses.

### Frontend Integration (Next.js)

*   **Trigger Scrape Component**: A React component with an input field for the profile URL and a button. On submission, it calls the `useMutation(api.actions.scrape.initiateScrape)` hook.
*   **Display Profile Component**: A React component that uses `useQuery(api.queries.profiles.getProfileByUsername)` to display the fetched profile data and posts. This component will automatically re-render as new data arrives (e.g., after a successful scrape webhook updates the database).
*   **Loading/Status Indicators**: Show loading states while a scrape is in progress, potentially using `useQuery(api.queries.profiles.getRecentScrapeJobs)` to display the status of the requested scrape.

## Code Patterns

### Convex Backend Functions

#### `convex/schema.ts` (Example Data Structures)
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    username: v.string(),
    displayName: v.string(),
    pictureUrl: v.string(),
    bio: v.string(),
    followerCount: v.number(),
    lastScraped: v.number(), // Timestamp
    // Add other profile fields as needed
  }).index("by_platform_username", ["platform", "username"]), // For efficient lookup

  posts: defineTable({
    profileId: v.id("profiles"),
    postUrl: v.string(),
    caption: v.string(),
    hashtags: v.optional(v.array(v.string())),
    date: v.number(), // Timestamp
    thumbnailUrl: v.string(),
    views: v.optional(v.number()),
    likes: v.number(),
    comments: v.number(),
    shares: v.optional(v.number()),
    videoPlaybackUrl: v.optional(v.string()), // TikTok specific
  }).index("by_profile_id", ["profileId"]),

  scrapeJobs: defineTable({
    jobId: v.string(), // ID from the custom scraper service
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    profileUrl: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    initiatedAt: v.number(),
    completedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    // Link to the resulting profile ID once completed
    resultProfileId: v.optional(v.id("profiles")),
  }).index("by_job_id", ["jobId"]),
});
```

#### `convex/actions/scrape.ts`

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

// Define the expected payload from your custom scraper's webhook
const scraperWebhookPayload = v.object({
  jobId: v.string(),
  platform: v.union(v.literal("instagram"), v.literal("tiktok")),
  profileUrl: v.string(),
  status: v.union(v.literal("completed"), v.literal("failed")),
  data: v.optional(v.object({ /* ... profile data fields ... */ })), // Scraped profile data
  posts: v.optional(v.array(v.object({ /* ... post data fields ... */ }))), // Scraped posts
  error: v.optional(v.string()),
  // CRITICAL: A shared secret or token to validate the webhook origin
  webhookSecret: v.string(), 
});

export const initiateScrape = action({
  args: {
    profileUrl: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
  },
  handler: async (ctx, { profileUrl, platform }) => {
    const scraperServiceUrl = process.env.SOCIAL_SCRAPER_SERVICE_URL;
    const scraperApiKey = process.env.SOCIAL_SCRAPER_API_KEY;

    if (!scraperServiceUrl || !scraperApiKey) {
      throw new Error("Social Scraper service URL or API key not configured.");
    }

    try {
      // 1. Trigger a Convex Mutation to record the pending job
      const jobId = await ctx.runMutation(api.mutations.profiles.createScrapeJob, {
        profileUrl,
        platform,
        status: 'pending'
      });

      // 2. Call your custom scraper service API
      const response = await fetch(`${scraperServiceUrl}/api/scrape-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": scraperApiKey, // Use your custom scraper's API key
        },
        body: JSON.stringify({
          profileUrl,
          platform,
          // CRITICAL: Pass the Convex webhook URL and secret to the scraper
          // so it knows where to send results.
          callbackUrl: `${process.env.CONVEX_DEPLOY_URL}/api/actions/scrape:receiveScrapeWebhook`,
          callbackSecret: process.env.SOCIAL_SCRAPER_WEBHOOK_SECRET,
          jobId: jobId // Pass the Convex-generated jobId to the scraper
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Scraper service error:", errorText);
        await ctx.runMutation(api.mutations.profiles.updateScrapeJobStatus, {
          jobId,
          status: 'failed',
          error: `Scraper initiation failed: ${errorText}`
        });
        throw new Error(`Failed to initiate scrape: ${response.status} ${errorText}`);
      }

      const { scraperJobId } = await response.json(); // Scraper might return its own job ID
      // Update the Convex job with the scraper's job ID if different
      await ctx.runMutation(api.mutations.profiles.updateScrapeJobId, {
        convexJobId: jobId,
        scraperJobId: scraperJobId || jobId // Use scraper's ID or fall back to Convex's
      });

      return { success: true, jobId };
    } catch (error) {
      console.error("Error initiating scrape:", error);
      throw new Error(`Failed to initiate scrape: ${(error as Error).message}`);
    }
  },
});

export const receiveScrapeWebhook = action({
  args: scraperWebhookPayload,
  handler: async (ctx, payload) => {
    // CRITICAL: Validate the webhook secret
    if (payload.webhookSecret !== process.env.SOCIAL_SCRAPER_WEBHOOK_SECRET) {
      console.warn("Unauthorized webhook attempt.");
      throw new Error("Unauthorized webhook.");
    }

    if (payload.status === "completed" && payload.data && payload.posts) {
      // Trigger a mutation to save the data
      await ctx.runMutation(api.mutations.profiles.saveScrapedData, {
        jobId: payload.jobId,
        platform: payload.platform,
        profileData: payload.data,
        posts: payload.posts,
      });
      console.log(`Scrape job ${payload.jobId} completed and data saved.`);
    } else if (payload.status === "failed" && payload.error) {
      await ctx.runMutation(api.mutations.profiles.updateScrapeJobStatus, {
        jobId: payload.jobId,
        status: 'failed',
        error: payload.error
      });
      console.error(`Scrape job ${payload.jobId} failed: ${payload.error}`);
    } else {
      console.warn(`Webhook received for job ${payload.jobId} with unknown status or missing data.`);
    }
    return { success: true };
  },
});
```

#### `convex/mutations/profiles.ts`

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api"; // For running other mutations/actions

export const createScrapeJob = mutation({
  args: {
    profileUrl: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    status: v.literal("pending"),
  },
  handler: async (ctx, { profileUrl, platform, status }) => {
    // Generate a unique ID for Convex to track the job internally
    const jobId = `convex-job-${crypto.randomUUID()}`; 
    await ctx.db.insert("scrapeJobs", {
      jobId,
      profileUrl,
      platform,
      status,
      initiatedAt: Date.now(),
    });
    return jobId; // Return this internal ID
  },
});

export const updateScrapeJobId = mutation({
  args: {
    convexJobId: v.string(),
    scraperJobId: v.string(),
  },
  handler: async (ctx, { convexJobId, scraperJobId }) => {
    const job = await ctx.db.query("scrapeJobs").withIndex("by_job_id", (q) => q.eq("jobId", convexJobId)).unique();
    if (job) {
      await ctx.db.patch(job._id, { jobId: scraperJobId }); // Update to use scraper's ID
    }
  },
});

export const saveScrapedData = mutation({
  args: {
    jobId: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
    profileData: v.object({ /* ... matching schema fields ... */ }),
    posts: v.array(v.object({ /* ... matching schema fields ... */ })),
  },
  handler: async (ctx, { jobId, platform, profileData, posts }) => {
    const { username, displayName, pictureUrl, bio, followerCount } = profileData;

    // 1. Find or create the profile
    let profile = await ctx.db
      .query("profiles")
      .withIndex("by_platform_username", (q) => q.eq("platform", platform).eq("username", username))
      .unique();

    let profileId;
    if (profile) {
      profileId = profile._id;
      await ctx.db.patch(profileId, {
        displayName,
        pictureUrl,
        bio,
        followerCount,
        lastScraped: Date.now(),
      });
    } else {
      profileId = await ctx.db.insert("profiles", {
        platform,
        username,
        displayName,
        pictureUrl,
        bio,
        followerCount,
        lastScraped: Date.now(),
      });
    }

    // 2. Delete old posts for this profile to avoid duplicates/stale data
    const existingPosts = await ctx.db.query("posts").withIndex("by_profile_id", (q) => q.eq("profileId", profileId)).collect();
    await Promise.all(existingPosts.map(post => ctx.db.delete(post._id)));

    // 3. Insert new posts
    await Promise.all(
      posts.map((post) =>
        ctx.db.insert("posts", {
          profileId,
          ...post,
          date: new Date(post.date).getTime(), // Ensure timestamp
        })
      )
    );

    // 4. Update the scrape job status
    const job = await ctx.db.query("scrapeJobs").withIndex("by_job_id", (q) => q.eq("jobId", jobId)).unique();
    if (job) {
      await ctx.db.patch(job._id, {
        status: 'completed',
        completedAt: Date.now(),
        resultProfileId: profileId
      });
    }
  },
});

export const updateScrapeJobStatus = mutation({
  args: {
    jobId: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, error }) => {
    const job = await ctx.db.query("scrapeJobs").withIndex("by_job_id", (q) => q.eq("jobId", jobId)).unique();
    if (job) {
      await ctx.db.patch(job._id, {
        status,
        completedAt: status === 'completed' || status === 'failed' ? Date.now() : undefined,
        error: error || undefined,
      });
    } else {
      console.warn(`Attempted to update status for non-existent job: ${jobId}`);
    }
  },
});
```

#### `convex/queries/profiles.ts`

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getProfileByUsername = query({
  args: {
    username: v.string(),
    platform: v.union(v.literal("instagram"), v.literal("tiktok")),
  },
  handler: async (ctx, { username, platform }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_platform_username", (q) => q.eq("platform", platform).eq("username", username))
      .unique();

    if (!profile) {
      return null;
    }

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_profile_id", (q) => q.eq("profileId", profile._id))
      .collect();

    return { profile, posts };
  },
});

export const getRecentScrapeJobs = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("scrapeJobs")
      .order("desc")
      .take(10); // Get last 10 jobs
  },
});
```

## Testing & Debugging

1.  **Convex Action `initiateScrape`**:
    *   **Unit Test**: Use `npx convex test` to test the action. Mock the `fetch` call to your scraper service to simulate successful and failed initiations.
    *   **Local Testing**: Run `convex dev`, then call `initiateScrape` from your Next.js frontend or a test script. Observe network requests and Convex logs.
    *   **Scraper Service Logs**: Monitor your VPS scraper service logs to ensure it receives the request and starts the job.

2.  **Convex Action `receiveScrapeWebhook`**:
    *   **Simulation**: Manually trigger a `POST` request to your `CONVEX_DEPLOY_URL/api/actions/scrape:receiveScrapeWebhook` endpoint (e.g., using Postman, curl, or a simple Node.js script) with a mock `ScraperWebhookPayload`. Include the correct `webhookSecret`.
    *   **Validation**: Verify that the data is correctly saved in your Convex database via the `convex dashboard` or by querying the data. Test with invalid `webhookSecret` to ensure rejection.

3.  **Convex Mutations (`saveScrapedData`, `updateScrapeJobStatus`)**:
    *   **Direct Testing**: Write unit tests for mutations.
    *   **Integration Testing**: Verify behavior via the `receiveScrapeWebhook` action. Check for idempotency by sending the same webhook payload multiple times.

4.  **Convex Queries (`getProfileByUsername`, `getRecentScrapeJobs`)**:
    *   **Frontend Integration**: Ensure your Next.js components correctly display data returned by these queries.
    *   **Real-time Updates**: Verify that when new data is scraped and saved (via webhook -> mutation), the frontend components using `useQuery` automatically update without manual refresh.

5.  **End-to-End Flow**:
    *   Trigger a scrape from the frontend.
    *   Monitor `convex dev` logs for `initiateScrape` action.
    *   Monitor VPS scraper logs for job start.
    *   Wait for the scraper to complete.
    *   Monitor `convex dev` logs for `receiveScrapeWebhook` action and subsequent mutations.
    *   Verify data appears in the frontend and `convex dashboard`.

## Environment Variables

These variables need to be set in your Convex deployment settings (`convex env set`) and locally (`.env.local` for Next.js, `~/.config/convex/.env` for local Convex dev server).

```dotenv
# --- Convex Backend ---
# The URL of your deployed Convex backend. Used by the scraper to send webhooks.
CONVEX_DEPLOY_URL="https://<your-convex-app>.convex.cloud"

# Your custom social scraper service's base URL (running on VPS)
SOCIAL_SCRAPER_SERVICE_URL="http://<your-vps-ip-or-domain>:<port>"

# API Key for Convex to authenticate with your custom social scraper service
SOCIAL_SCRAPER_API_KEY="your_secure_scraper_api_key"

# Secret token for your custom social scraper to authenticate its webhook calls to Convex
SOCIAL_SCRAPER_WEBHOOK_SECRET="your_secure_webhook_secret_for_convex"

# --- Next.js Frontend (if directly used in frontend code, though Convex Actions are preferred) ---
# NEXT_PUBLIC_CONVEX_URL="https://<your-convex-app>.convex.cloud"
# CLERK_SECRET_KEY="sk_live_..."
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_..."
```

## Success Metrics

*   [ ] User can successfully initiate an Instagram or TikTok profile scrape from the Next.js frontend.
*   [ ] The Convex `initiateScrape` action correctly calls the custom scraper service.
*   [ ] The custom scraper service receives the request, starts the job, and eventually sends a webhook.
*   [ ] The Convex `receiveScrapeWebhook` action correctly validates the webhook secret and processes the payload.
*   [ ] Scraped profile data (username, display name, picture, bio, follower counts) is accurately saved in the Convex database.
*   [ ] Up to 30 posts per profile are saved, including URL, caption, hashtags, date, thumbnail, and metrics.
*   [ ] TikTok video playback URLs are correctly stored.
*   [ ] The frontend component using `