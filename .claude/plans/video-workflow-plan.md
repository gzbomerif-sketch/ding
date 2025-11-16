# Roadmap: Video Workflow

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Creator Video Upload & Display, enabling video upload, approval workflow, and display, with Convex handling storage and database, and Clerk managing authentication. "Custom" refers to the custom workflow built using these technologies.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account and project.
- [ ] Create Clerk account and application.
- [ ] Configure Clerk JWT Template for Convex integration, copying the Issuer URL.
- [ ] Set up Convex environment variables for Clerk Issuer URL.
- [ ] Create an account with a video thumbnail generation service (e.g., Cloudinary, Mux, or similar simple API for initial MVP) and obtain API keys.
- [ ] Configure environment variables in Convex for the thumbnail generation service API keys.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `@clerk/nextjs`, `@convex-dev/react`, `@convex-dev/clerk`, `@convex-dev/ratelimiter` (for rate limiting video uploads).
- [ ] Env vars: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_JWT_ISSUER_DOMAIN`, `THUMBNAIL_SERVICE_API_KEY`, `THUMBNAIL_SERVICE_BASE_URL`.

### 3. Database Schema
- [ ] `videos` table:
    - `creatorId`: `Id("users")` (indexed, linked to Clerk `userId`)
    - `campaignId`: `Id("campaigns")` (indexed)
    - `storageId`: `Id("_storage")` (linked to Convex file storage)
    - `thumbnailUrl`: `v.string()`
    - `caption`: `v.string()`
    - `platform`: `v.array(v.string())` (e.enum("Instagram", "TikTok"))
    - `hashtags`: `v.array(v.string())`
    - `status`: `v.string()` (e.enum("uploaded", "under review", "approved", "changes needed"))
    - `approvalFeedback`: `v.optional(v.string())`
    - `approvedBy`: `v.optional(v.array(Id("users")))` (for multi-admin approval)
    - `paymentStatus`: `v.string()` (e.enum("pending", "paid"))
    - `postCreatedAt`: `v.number()` (timestamp)
    - `engagementMetrics`: `v.object()` (e.g., `likes`, `comments`, `shares`, `views`) - (Consider as embedded or separate `performance_metrics` table for granular data)
- [ ] `performance_metrics` table (if not embedded in `videos`):
    - `videoId`: `Id("videos")` (indexed)
    - `metricType`: `v.string()` (e.g., "likes", "comments")
    - `value`: `v.number()`
    - `timestamp`: `v.number()` (when metric was recorded)
- [ ] `users` table: (Ensure `clerkId` is linked and indexed)
    - `clerkId`: `v.string()` (indexed)
    - `isAdmin`: `v.boolean()`
    - `earnings`: `v.number()`
    - `totalBudgetDistributed`: `v.number()` (if admins distribute budget)

### 4. Backend Functions
- [ ] `videos.generateUploadUrl`: Convex Mutation to generate a `storage.generateUploadUrl()` for video uploads.
- [ ] `videos.createVideo`: Convex Mutation to create a `video` document in the database, saving the `storageId`, `creatorId`, `campaignId`, `caption`, `platform`, `hashtags`, and initial `status` ("uploaded").
- [ ] `videos.getVideosByCreator`: Convex Query to fetch videos filtered by `creatorId`, for creator's dashboard display.
- [ ] `videos.getVideoDetail`: Convex Query to fetch a single video's details, including related `performance_metrics` (if separate table).
- [ ] `videos.updateVideoStatus`: Convex Mutation to update video `status`, `approvalFeedback`, and `approvedBy` (admin-only).
- [ ] `videos.updateVideoPaymentStatus`: Convex Mutation to update `paymentStatus` (admin-only).
- [ ] `videos.resubmitVideo`: Convex Mutation to allow creators to resubmit videos after changes, updating `storageId` and `status` to "under review".
- [ ] `videos.generateThumbnail`: Convex Action to call an external API (e.g., Cloudinary, Mux) using the stored video URL to generate a thumbnail and then update the `videos` table with `thumbnailUrl`. This action should be scheduled/triggered after video upload.
- [ ] `videos.extractInitialMetrics`: Convex Action (or internal mutation called by action) to simulate initial metric extraction and save data to `performance_metrics` or `engagementMetrics` field. This action should be triggered after video approval.
- [ ] `auth.config.ts`: Clerk-Convex authentication configuration.
- [ ] `rateLimits.ts`: Convex Rate Limiter configuration for video uploads (e.g., per user, per time period).

### 5. Frontend
- [ ] `VideoUploadForm` Component:
    - Campaign selector (dropdown, fetching campaigns from Convex).
    - File input for video (`<input type="file" accept="video/*">`).
    - Video preview (using a URL generated locally or a placeholder).
    - Caption input (textarea).
    - Platform selection (checkboxes/multi-select for Instagram, TikTok).
    - Hashtag input with suggestions (fetching from a Convex query or client-side logic).
    - Progress indicator for upload.
    - Submit button, calling `videos.generateUploadUrl` and then `videos.createVideo`.
- [ ] `CreatorVideoGrid` Component:
    - Displays videos in a grid with thumbnails, platform indicators, timestamps, approval/payment badges. Fetches data using `videos.getVideosByCreator`.
- [ ] `CreatorVideoList` Component:
    - Similar to grid, but adds campaign name and earnings.
- [ ] `VideoDetailModal` Component:
    - Displays video preview (HTML `<video>` tag using Convex file URL).
    - Full metrics from `performance_metrics` (Convex query).
    - Approval history (from `videos` table or a dedicated `approval_log` table if more detailed history is needed).
    - Payment status.
    - Edit/resubmit option (conditional based on `status`).
- [ ] `AdminApprovalDashboard` Component:
    - List of videos "under review".
    - Admin interface for viewing video details.
    - Input for feedback.
    - Buttons for "Approve" and "Request Changes".
    - Multi-admin approval indicator.
- [ ] `ClerkProvider` and `ConvexProviderWithClerk`: Root components for authentication and Convex integration.

### 6. Error Prevention
- [ ] API errors: Implement client-side `try-catch` blocks for Convex mutations and actions. Display user-friendly error messages.
- [ ] Validation:
    - Frontend validation (file type, size before upload, caption length, platform selection).
    - Backend validation in Convex mutations (e.g., `v.id("campaigns")`, `v.string()`, `v.array(v.string())`).
    - Authorization checks in Convex functions using `ctx.auth` for `creatorId` and `isAdmin` roles.
- [ ] Rate limiting: Implement `Convex rate limiter` on `videos.generateUploadUrl` and `videos.createVideo` to prevent abuse.
- [ ] Auth: Secure all sensitive Convex functions with `ctx.auth` to ensure only authenticated and authorized users can perform actions (e.g., only creators can upload their videos, only admins can approve).
- [ ] Type safety: Leverage Convex's end-to-end type safety and TypeScript for all functions and schemas.
- [ ] Boundaries: Handle video file size limits (Convex upload URL timeout, HTTP action limit). Implement a fallback for `thumbnailUrl` if generation fails.

### 7. Testing
- [ ] Video upload flow: Verify successful upload, metadata storage, and initial status.
- [ ] Thumbnail generation: Test if the `generateThumbnail` action correctly calls the external service and updates `thumbnailUrl`.
- [ ] Approval workflow: Test transitions between "uploaded", "under review", "approved", "changes needed" for creators and admins.
- [ ] Resubmission: Verify creators can resubmit and status updates correctly.
- [ ] Metrics extraction: Test automatic metric extraction and storage after approval.
- [ ] Display: Verify videos display correctly in grid/list views with accurate details and badges.
- [ ] Authorization: Test that unauthenticated/unauthorized users cannot upload, approve, or modify video data.
- [ ] Edge cases: Large file upload handling, network errors during upload, invalid file types.
- [ ] Rate limits: Test that rate limits are enforced for uploads.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHJ8RNurwdoRarR8OoP8cv3AlG3bbXGxzq_Kww5yF-ei7wCAVsaw6ri35bg4BDfnHVMNSqwF8xBogDL6MptPhr1rYwDzskD_txWkuISOawR4mnf98t527rBr_enIYyr
2. skywork.ai: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHF0MmdEflrS2I6HQKEy0Acn5NBeLHjCsN6kNeOdFHD0SoJdCdiaFApEKt0bVqrBIwMTVqldYuODcBEDIxLCDc1zVKVNbfV6gzjITGwBFWfdEP8_5OAQMEYQHoAz5qPV79wXy2cjsePCLvP58zFesh28Zv84VrL68lfy5iwZWFHiPoyCUqPmHPf-1yE3aZiuPD9le35WTTZljP_CuNLY46ynLrikbub
3. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHoUrAg6lB-KNsLfru0EomBqt9hTXJCakWeyemN96KOm0dzwX7-eAEl8YB_Pfe4RMv7wal5L57Iiq446RBWH7my-kMjYf027kFyfnSLwR5ZGEHZB_UE5xnIuP5fF-QoH6o9216P0x_LhrG4IVo=
4. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFt0DTnJvCBhFfxxPpiQJn2THefnFoCjLtEf_iz6obkWq-GqwfPEnPRv3Etca-H2G1JCcfS-4pd4lGxNK4IpDuPsVRnGTzTSbIeGe1khP8SKKD2CF_m6Ubashk2esEQY9yg3skd8jlRR22XmQ==
5. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGwr00h9SeR0hNqPUV4N-k76hEOaQ3gqWNRqijICgN0elAt6a1qKmyqPSEtTCWSB3t1HZmt10kccf0rYk39BPGO37unhGOTpJheJpzHCMd66Z1wcRo4o-FxwP2kbQsj0g==
