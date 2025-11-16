# Roadmap: Site Mirror

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Site Mirror with Apify (as a representative third-party API for full site download)
- Goal: Enable users (brands/team) to input a URL and generate a browsable local copy (e.g., ZIP file) of the website for offline reference and analysis, supporting creator marketing strategy and data analytics.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Apify account.
- [ ] Configure Apify Console (e.g., explore "Website Downloader" Actor or similar web crawling Actors).
- [ ] Generate Apify API token.
- [ ] Configure webhooks in Apify for job completion notifications (optional but recommended for async operations).
- [ ] Configure billing on Apify for usage-based costs.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `next` (already present), `clerk/nextjs` (already present)
- [ ] Env vars: `APIFY_API_TOKEN` (from step 1), `CONVEX_WEBHOOK_SECRET` (if using webhooks from Apify to Convex)

### 3. Database Schema (Convex)
- [ ] `mirrorJobs` table:
    - `userId`: `Id<'users'>` (Clerk user ID)
    - `url`: `string` (Original URL to mirror)
    - `status`: `string` (`'pending'`, `'crawling'`, `'completed'`, `'failed'`)
    - `apifyJobId`: `string` (Apify's internal job ID for tracking)
    - `downloadUrl`: `string | null` (URL to the generated ZIP file, populated on completion)
    - `createdAt`: `number` (Timestamp)
    - `updatedAt`: `number` (Timestamp)

### 4. Backend Functions (Convex)
- [ ] `mirrorJobs:create`: Callable by authenticated users.
    - Purpose: Initiates a new site mirror job.
    - Action: Stores `userId`, `url`, `status: 'pending'` in `mirrorJobs` table. Calls Apify API to start the "Website Downloader" Actor with the provided URL. Stores `apifyJobId`.
- [ ] `mirrorJobs:getById`: Callable by authenticated users.
    - Purpose: Retrieves the status and details of a specific mirror job.
    - Action: Fetches a `mirrorJob` by its ID, ensuring `userId` matches the authenticated user.
- [ ] `mirrorJobs:listForUser`: Callable by authenticated users.
    - Purpose: Lists all mirror jobs for the current user.
    - Action: Fetches all `mirrorJobs` associated with the authenticated `userId`.
- [ ] `apify:webhookHandler`: Callable as a webhook by Apify (public, but with secret verification).
    - Purpose: Receives status updates from Apify about mirror jobs.
    - Action: Validates `CONVEX_WEBHOOK_SECRET`. Updates `mirrorJobs` table based on Apify's notification (e.g., `status: 'completed'`, `downloadUrl`, `status: 'failed'`).

### 5. Frontend (Next.js)
- [ ] Components:
    - `SiteMirrorForm`: Input field for URL, submit button.
    - `MirrorJobCard`: Displays status, original URL, and a download link (if `status: 'completed'`).
    - `MirrorJobList`: Fetches and displays `MirrorJobCard` components for the current user's jobs.
- [ ] State:
    - `mirrorJobStatus`: Manages loading states, form input, and job submission.
    - `userMirrorJobs`: Stores a list of fetched mirror jobs, updated via Convex queries.
    - Real-time updates for job status using Convex's reactive queries.

### 6. Error Prevention
- [ ] API errors: Implement `try/catch` for Apify API calls within Convex functions.
- [ ] Validation: Frontend and backend URL validation (format, accessibility checks).
- [ ] Rate limiting: Monitor Apify usage; Apify handles its internal rate limiting. Consider internal rate limiting for users if abuse is a concern.
- [ ] Auth: Clerk for all user-facing Convex functions. Webhook handler protected by `CONVEX_WEBHOOK_SECRET`.
- [ ] Type safety: Use TypeScript for Convex schemas and frontend/backend interactions.
- [ ] Boundaries: Set reasonable limits on crawl depth/size in Apify Actor configuration to manage costs and processing time.

### 7. Testing
- [ ] Test scenarios:
    - User submits a valid URL.
    - User submits an invalid URL.
    - Apify job completes successfully.
    - Apify job fails (e.g., website unreachable, timeout).
    - User views their list of mirror jobs.
    - User attempts to view/download another user's job (should be prevented by auth).
    - Download link is correct and functional upon job completion.
    - Webhook successfully updates job status in Convex.