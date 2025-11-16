---
name: agent-SiteMirrorService-SiteMirror
description: Implements Full Site Download (Site Mirror) using a hypothetical external Site Mirror API service with Convex and Next.js.
model: inherit
color: purple
---


# Agent: Site Mirror Implementation with SiteMirrorService (Hypothetical API)

## Agent Overview
**Purpose**: This agent provides comprehensive instructions for integrating a "Site Mirror" feature (Full Site Download) into a Next.js application using Convex as the backend. It outlines the process of interacting with a hypothetical external Site Mirror API service, managing long-running tasks with Convex Actions, and displaying the results on the frontend.
**Tech Stack**: Next.js, React, Convex, Clerk (Authentication)
**Source**: General best practices for external API integration with Convex, web crawling/archiving concepts.

## Critical Implementation Knowledge
### 1. SiteMirrorService Latest Updates 🚨
Since "Custom API" is a generic placeholder, we will assume a hypothetical `SiteMirrorService` that provides the requested functionality. The most critical aspect for any such service would be its API version, authentication methods, and rate limits. Always refer to the service's official documentation for the latest API endpoints, request/response formats, and any breaking changes.
*   **Latest API Version**: Always pin your API client to a specific, stable version to avoid unexpected breaking changes.
*   **Asynchronous Operations**: Full site downloads are typically long-running. The API will likely follow an asynchronous pattern:
    1.  Initiate a job (returns `jobId`).
    2.  Poll for status or receive a webhook notification upon completion.
    3.  Retrieve results (e.g., download URL, browsable URL).

### 2. Common Pitfalls & Solutions 🚨
*   **Long-Running Tasks in Convex**: Direct, synchronous HTTP calls for a full site mirror would exceed Convex Action runtime limits.
    *   **Solution**: Use a Convex Action to *initiate* the mirror job with the external service. The action should immediately return a `jobId` to the client. The external service should then either:
        *   Provide a webhook callback URL (pointing to a Next.js API route that then calls a Convex Mutation to update status).
        *   Require the client (or another Convex Action) to poll for job status periodically. Polling should be handled carefully to avoid excessive requests.
*   **CORS Issues**: When calling external APIs directly from the frontend, CORS issues are common.
    *   **Solution**: All calls to the external `SiteMirrorService` *must* be proxied through Convex Actions to avoid CORS errors and protect API keys.
*   **API Key Exposure**: Directly embedding API keys in frontend code is a security vulnerability.
    *   **Solution**: Store `SiteMirrorService` API keys securely as Convex environment variables (`CONVEX_SITE_MIRROR_API_KEY`) and access them only within Convex Actions.
*   **Rate Limiting**: Exceeding the external service's rate limits can lead to temporary or permanent bans.
    *   **Solution**: Implement retry mechanisms with exponential backoff in Convex Actions. Monitor API usage. For polling, use sensible intervals and potentially cap the number of retries.
*   **Handling Large Files**: A full site mirror can produce very large archives. Directly storing these in Convex File Storage might be inefficient or hit size limits.
    *   **Solution**: Let the external `SiteMirrorService` host the mirrored content. The Convex backend will store only the URL to access this hosted content, or metadata about it. If local storage is critical, investigate object storage solutions (AWS S3, Google Cloud Storage) and integrate them via a Convex Action or a Next.js API route if direct S3 interaction is needed outside Convex runtime.

### 3. Best Practices 🚨
*   **Asynchronous Processing**: Always design the mirroring process as asynchronous.
*   **Idempotency**: Ensure that initiating the same mirror job multiple times doesn't cause issues on the external service or duplicate database entries.
*   **Robust Error Handling**: Implement comprehensive `try/catch` blocks in Convex Actions for external API calls, and handle various HTTP status codes.
*   **Logging & Monitoring**: Log job statuses, errors, and completion notifications to aid debugging and operational oversight.
*   **Security**: Protect API keys and sensitive data. Validate user inputs (e.g., URLs) before sending them to the external service.
*   **User Feedback**: Provide clear feedback to the user on the frontend about the mirroring job's status (pending, in progress, complete, failed). Use Convex Queries for real-time updates.

## Implementation Steps
1.  **Configure Environment Variables**: Set up API keys and service URLs for `SiteMirrorService` in your Convex and Next.js environment.
2.  **Define Convex Schema**: Create a Convex table (`siteMirrors`) to store metadata about each mirror job.
3.  **Implement Convex Actions**:
    *   `initiateSiteMirror`: Calls the external `SiteMirrorService` API to start a crawl.
    *   `checkSiteMirrorStatus` (optional, for polling): Calls the external API to get job status.
    *   `handleMirrorCompletion` (for webhooks): Triggered by a Next.js API route to update status.
4.  **Implement Convex Mutations**:
    *   `createMirrorJob`: Records a new mirror request in the database.
    *   `updateMirrorJobStatus`: Updates the status and results (e.g., `viewUrl`, `downloadUrl`) of a job.
5.  **Implement Convex Queries**:
    *   `getMirrorJobs`: Fetches a list of mirror jobs for the authenticated user.
    *   `getMirrorJobById`: Fetches details for a specific mirror job.
6.  **Develop Next.js API Route (for webhooks)**: If `SiteMirrorService` supports webhooks, create a Next.js API route to receive callbacks. This route will then call a Convex Mutation.
7.  **Frontend Integration**: Build UI components for submitting URLs, displaying job progress, and rendering/linking to the mirrored site.

### Backend Implementation
The backend logic will reside primarily in Convex functions, leveraging Convex Actions for external API interactions and Convex Mutations/Queries for data persistence and retrieval.

#### Convex Functions (Primary)
*   `convex/siteMirrors.ts`:
    *   **Action**: `initiateSiteMirror(url: string)`:
        *   Receives the URL from the frontend.
        *   Calls the external `SiteMirrorService` API to start the mirroring process.
        *   Immediately calls a `createMirrorJob` mutation to record the request and the external `jobId`.
        *   Returns the `jobId` to the frontend.
        *   Handles initial API errors.
    *   **Mutation**: `createMirrorJob(jobId: string, url: string, userId: Id<'users'>, status: 'pending' | 'in_progress')`:
        *   Creates a new entry in the `siteMirrors` table.
    *   **Mutation**: `updateMirrorJobStatus(jobId: string, status: 'completed' | 'failed', viewUrl?: string, downloadUrl?: string, error?: string)`:
        *   Updates an existing `siteMirrors` entry with the latest status and results.
    *   **Query**: `getMirrorJobs(userId: Id<'users'>)`:
        *   Retrieves all mirror jobs associated with the current user, enabling real-time UI updates.
    *   **Query**: `getMirrorJobById(jobId: string, userId: Id<'users'>)`:
        *   Retrieves details for a single mirror job.

#### Next.js API Route (Optional, for webhooks)
*   `pages/api/site-mirror-webhook.ts`:
    *   Receives POST requests from the `SiteMirrorService` upon job completion or status updates.
    *   Validates the webhook signature/secret to ensure it's from the legitimate service.
    *   Extracts `jobId`, `status`, `viewUrl`, `downloadUrl`, etc., from the payload.
    *   Calls the `updateMirrorJobStatus` Convex Mutation to update the database.

### Frontend Integration
1.  **Input Form**: A form to capture the URL the user wants to mirror.
2.  **Trigger Action**: On form submission, call the `useMutation(api.siteMirrors.initiateSiteMirror)` hook.
3.  **Display Status**: Use `useQuery(api.siteMirrors.getMirrorJobs)` or `useQuery(api.siteMirrors.getMirrorJobById)` to display a list of jobs and their real-time statuses.
4.  **Display Results**: Once a job is `completed`, render a link to the `viewUrl` or `downloadUrl`. Consider using an `<iframe>` if the `viewUrl` allows embedding and the mirrored content is properly isolated and secured.

## Code Patterns

### Convex Backend Functions (High-level)

```typescript
// convex/siteMirrors.ts

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// --- Actions ---
export const initiateSiteMirror = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, { url }) => {
    // 1. Authenticate user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const userId = identity.subject;

    // 2. Call external SiteMirrorService API
    const siteMirrorServiceApiKey = process.env.SITE_MIRROR_API_KEY;
    if (!siteMirrorServiceApiKey) {
      throw new Error("SITE_MIRROR_API_KEY environment variable not set.");
    }

    try {
      const response = await fetch("https://api.sitemirrorservice.com/mirror", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": siteMirrorServiceApiKey,
        },
        body: JSON.stringify({
          targetUrl: url,
          // If the service supports webhooks, pass a callback URL pointing to your Next.js API route
          callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/site-mirror-webhook`,
          userId: userId, // Pass user ID for tracking in the external service if needed
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Site Mirror Service API error: ${errorData.message || response.statusText}`);
      }

      const { jobId } = await response.json(); // Assuming the service returns a jobId

      // 3. Record job in Convex DB immediately
      await ctx.runMutation(api.siteMirrors.createMirrorJob, {
        jobId,
        url,
        userId,
        status: "in_progress",
      });

      return jobId; // Return jobId to frontend for tracking
    } catch (error: any) {
      console.error("Failed to initiate site mirror:", error.message);
      throw new Error(`Failed to initiate site mirror: ${error.message}`);
    }
  },
});

// --- Mutations ---
export const createMirrorJob = mutation({
  args: {
    jobId: v.string(),
    url: v.string(),
    userId: v.string(), // Clerk's subject ID
    status: v.union(v.literal("in_progress"), v.literal("pending")),
  },
  handler: async (ctx, { jobId, url, userId, status }) => {
    // Ensure the job doesn't already exist (idempotency check)
    const existingJob = await ctx.db
      .query("siteMirrors")
      .withIndex("by_job_id", (q) => q.eq("jobId", jobId))
      .first();

    if (existingJob) {
      return existingJob._id; // Return existing ID if already created
    }

    return await ctx.db.insert("siteMirrors", {
      jobId,
      url,
      userId,
      status,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateMirrorJobStatus = mutation({
  args: {
    jobId: v.string(),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("in_progress")),
    viewUrl: v.optional(v.string()),
    downloadUrl: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { jobId, status, viewUrl, downloadUrl, error }) => {
    const existingJob = await ctx.db
      .query("siteMirrors")
      .withIndex("by_job_id", (q) => q.eq("jobId", jobId))
      .first();

    if (!existingJob) {
      console.warn(`Mirror job with ID ${jobId} not found for status update.`);
      return;
    }

    await ctx.db.patch(existingJob._id, {
      status,
      viewUrl,
      downloadUrl,
      error,
      updatedAt: Date.now(),
    });
  },
});

// --- Queries ---
export const getMirrorJobs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // Not authenticated, return empty array
    }
    const userId = identity.subject;

    return await ctx.db
      .query("siteMirrors")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getMirrorJobById = query({
  args: { jobId: v.string() },
  handler: async (ctx, { jobId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const userId = identity.subject;

    const job = await ctx.db
      .query("siteMirrors")
      .withIndex("by_job_id", (q) => q.eq("jobId", jobId))
      .first();

    // Ensure the user owns the job
    if (job && job.userId === userId) {
      return job;
    }
    return null;
  },
});
```

### Convex Schema Definition
`convex/schema.ts`
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  siteMirrors: defineTable({
    jobId: v.string(), // External service's job ID
    url: v.string(), // Original URL requested for mirroring
    userId: v.string(), // Clerk's user ID (subject)
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("failed")),
    viewUrl: v.optional(v.string()), // URL to view the mirrored site
    downloadUrl: v.optional(v.string()), // URL to download the mirrored archive
    error: v.optional(v.string()), // Error message if job failed
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_job_id", ["jobId"]) // Index for quickly finding jobs by external ID
  .index("by_userId", ["userId"]), // Index for fetching all jobs by a user
});
```

## Testing & Debugging
*   **Convex Dev Console**: Use the Convex Dev Console to inspect database entries (`siteMirrors` table) and verify job statuses are updated correctly by mutations.
*   **Action Execution**: Test `initiateSiteMirror` by calling it directly from a test script or via the frontend. Observe network requests and the Convex Dev Console.
*   **Webhook Testing**: For the Next.js API route (if using webhooks), use tools like `ngrok` or `Convex dev` proxy (`npx convex dev --port 3000`) to expose your local development server to the internet, allowing the external `SiteMirrorService` to send callbacks. Simulate webhook payloads using `curl` or Postman.
*   **Error Cases**: Test failure scenarios: invalid URLs, external service errors, network issues. Verify that `error` fields are populated and statuses are correctly set to `failed`.
*   **Frontend State**: Verify that the UI updates reactively as `siteMirrors` data changes via Convex Queries.

## Environment Variables
Ensure these are set in your `.env.local` for local development and in your Convex deployment settings (`npx convex env`) for production.

```
# Convex Environment Variables (for Convex Cloud)
# Accessed via `process.env.<VAR_NAME>` in Convex functions
CONVEX_SITE_MIRROR_API_KEY=your_site_mirror_service_api_key

# Next.js Environment Variables (for Next.js app)
# Accessed via `process.env.NEXT_PUBLIC_<VAR_NAME>` in client-side code
# And `process.env.<VAR_NAME>` in server-side (Next.js API routes)
NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_BASE_URL=https://your-app-domain.com # Base URL for webhook callbacks
```
*Note: `NEXT_PUBLIC_BASE_URL` should be your deployed Next.js app's URL for production webhooks.*

## Success Metrics
*   **Successful Mirror Initiation**: Users can submit a URL, and a new `siteMirrors` entry with `in_progress` status is created in Convex, receiving an external `jobId`.
*   **Real-time Status Updates**: The frontend UI reflects the `in_progress`, `completed`, or `failed` status of a mirroring job in real-time using Convex Queries.
*   **Accessible Mirrored Content**: Upon `completed` status, a `viewUrl` and/or `downloadUrl` is present in the Convex database entry and accessible from the frontend.
*   **Error Handling Robustness**: Invalid URLs or external service failures are gracefully handled, updating the job status to `failed` with an informative `error` message.
*   **Security Compliance**: `SiteMirrorService` API keys are never exposed on the frontend.
*   **Authentication**: Only authenticated users can initiate and view their own mirror jobs.
*   **Convex Function Testing**:
    *   `initiateSiteMirror` action successfully calls external API and triggers `createMirrorJob` mutation.
    *   `createMirrorJob` mutation correctly inserts new records.
    *   `updateMirrorJobStatus` mutation correctly updates existing records.
    *   `getMirrorJobs` and `getMirrorJobById` queries return correct data for the authenticated user.
*   **Webhook Functionality (if applicable)**: The Next.js API route correctly receives webhooks from the `SiteMirrorService` and triggers `updateMirrorJobStatus` mutation in Convex.