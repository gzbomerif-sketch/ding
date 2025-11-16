---
name: agent-Convex-VideoWorkflow
description: Implements a comprehensive video workflow using Convex for backend logic, file storage, and external API orchestration.
model: inherit
color: purple
---


# Agent: Video Workflow Implementation with Convex

## Agent Overview
**Purpose**: This agent provides detailed, Convex-centric instructions for implementing a "Creator Video Upload & Display" feature. It focuses on using Convex actions, mutations, and queries for file handling, external API orchestration, approval workflows, and real-time display, integrated with Next.js and Clerk authentication.
**Tech Stack**: Next.js, React, Convex, Clerk
**Source**: Convex Developer Hub (File Storage, Actions, Clerk Integration), Next.js community resources for file uploads.

## Critical Implementation Knowledge
The "Custom API" for this project will be primarily implemented within Convex, leveraging its serverless functions (queries, mutations, actions) to manage the entire video workflow, from upload and processing orchestration to approval and display.

### 1. Convex Latest Updates 🚨
*   **Convex File Storage Enhancements**: Convex provides robust built-in file storage. For large files like videos, the recommended approach is using generated upload URLs to allow direct client-to-storage uploads, bypassing typical request size limits on mutations/actions.
*   **Convex Actions for Asynchronous Operations**: Actions are the cornerstone for long-running tasks and external API integrations. They can call queries and mutations to interact with the database, and importantly, can schedule other Convex functions using `ctx.scheduler` for asynchronous processing (e.g., video transcoding, thumbnail generation). [cite:Actions 1, 2, 4]
*   **Convex HTTP Actions**: Essential for receiving webhooks from external video processing services to update video status or metadata once processing is complete. [cite:Actions 3]
*   **Clerk Integration**: The `@convex-dev/react-clerk` package provides `ConvexProviderWithClerk` for seamless authentication management between Clerk and Convex, ensuring user context is available in your Convex functions. [cite:Auth 1, 2]

### 2. Common Pitfalls & Solutions 🚨
*   **Large File Upload Limits**: Direct file uploads through Convex Mutations/Actions are limited (e.g., HTTP Actions to 20MB).
    *   **Solution**: Always use `storage.generateUploadUrl()` via a Convex Mutation for large video files. This provides a temporary URL for the client to upload directly to Convex's storage, then a separate mutation saves the `storageId`. Alternatively, use a similar pattern with signed URLs for external cloud storage like Cloudflare R2 or AWS S3.
*   **Long-Running Video Processing Blocking UI**: Video encoding, thumbnail generation can take time and should not block the client.
    *   **Solution**: Use Convex Actions with `ctx.scheduler.runAction()` to trigger asynchronous processing tasks. The initial mutation can respond immediately, and the scheduled action can update the video status incrementally via further mutations. [cite:Actions 1, 4]
*   **Security for Uploads and Access**: Unrestricted file uploads or access can lead to security vulnerabilities.
    *   **Solution**: Implement `auth` checks in all Convex functions (`generateUploadUrl`, mutations for metadata, queries for fetching videos) to ensure only authenticated and authorized users can perform actions. [cite:Actions 2, Auth 2, 3] Generated upload URLs are short-lived (1 hour), adding a layer of security.
*   **CORS Issues with External Storage**: If using external storage like R2/S3, CORS policies must be correctly configured to allow client-side uploads.
    *   **Solution**: Configure CORS on your external storage bucket to allow `PUT` requests from your Next.js application's origin.

### 3. Best Practices 🚨
*   **Convex-First Backend Logic**: Default to Convex Mutations for all database writes and state changes, and Convex Queries for real-time data reads. Use Convex Actions for any logic involving external services or complex, non-transactional operations.
*   **Modular Backend Structure**: Organize your Convex functions logically (e.g., `videos.ts`, `auth.ts`, `storage.ts`) for maintainability.
*   **Clear Status Tracking**: Implement a robust `status` field in your video documents (e.g., `uploaded`, `processing`, `under review`, `approved`, `changes needed`, `rejected`) to guide the workflow and provide clear UI feedback.
*   **Leverage Real-time**: Utilize Convex Queries for displaying video lists and status updates in the UI to benefit from automatic real-time synchronization.
*   **Environment Variables**: Securely manage all API keys and sensitive configurations using Convex environment variables.
*   **Error Handling and Retries**: Implement retry logic in Convex Actions for transient external API failures (e.g., when calling video processing services). Convex does not automatically retry actions, as they can have side effects. [cite:Actions 4]

## Implementation Steps

### Backend Implementation (Convex)

1.  **Define Convex Schema**: Create a `videos` table in `convex/schema.ts` to store video metadata, including `creatorId` (from Clerk), `campaignId`, `storageId` (from Convex file storage or external service key), `thumbnailUrl`, `postCreatedAt`, `status`, `engagementMetrics`, `approvalHistory`, `paymentStatus`, `caption`, `platformSelections`, and `hashtags`. Add an `_storage` table if using Convex native file storage directly.
2.  **File Upload (`convex/videos.ts`)**:
    *   **Mutation `generateUploadUrl`**: Calls `ctx.storage.generateUploadUrl()` to get a URL for client-side direct upload. Authenticate with `ctx.auth.getUserIdentity()`.
    *   **Mutation `createVideo`**: Called *after* client-side upload. Takes the returned `storageId` (or external key), metadata (caption, campaign, platforms, etc.), and `creatorId` from `ctx.auth`. Inserts a new video document into the `videos` table with `status: "uploaded"`. This mutation should then *schedule an action* for processing.
3.  **Video Processing Orchestration (`convex/videos.actions.ts`)**:
    *   **Action `processVideo`**: Scheduled by `createVideo` mutation.
        *   Retrieves the video document and `storageId`.
        *   If `storageId` points to Convex Storage, `ctx.storage.getUrl(storageId)` can retrieve a URL for external processing. If external storage (R2/S3), use its URL.
        *   Calls an external video processing service (e.g., Mux, Cloudinary, or a custom service) to generate `thumbnailUrl`, extract `duration`, etc. This call should ideally be made