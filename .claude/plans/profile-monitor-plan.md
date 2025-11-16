The term "Custom" in "Profile Monitor using Custom" does not refer to a specific external API product. Instead, it implies building a *custom* profile monitoring system from scratch within the given Next.js, Convex, and Clerk stack. This involves custom web scraping logic for Instagram and TikTok, data storage, scheduling, and secure asset management, rather than integrating with a pre-built "Custom Profile Monitor API."

The research indicates that no single product named "Custom Profile Monitor API" exists that aligns with the detailed feature description (Convex schema, CSS selectors, VPS API, R2 uploads, custom scheduler). The requirements suggest building these components directly.

Therefore, the roadmap will focus on developing this bespoke solution, considering web scraping best practices, data management in Convex, and integration with Next.js and Clerk.

# Roadmap: Profile Monitor

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Profile Monitor with Custom (self-built scraping and data management solution)
- Goal: Monitor creator profiles on Instagram and TikTok, collect posts and metrics, store data, and provide insights for SylcRoad's platform.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account
- [ ] Create Clerk account
- [ ] Configure Clerk application for Next.js
- [ ] Set up an AWS S3-compatible storage bucket (e.g., Cloudflare R2, AWS S3) for screenshots
- [ ] Set up a Virtual Private Server (VPS) or a serverless function environment (e.g., AWS Lambda, Google Cloud Functions) for running headless browser scraping
- [ ] Generate API keys/credentials for the chosen VPS/serverless provider
- [ ] Generate API keys/credentials for R2/S3 storage

### 2. Dependencies & Environment
- [ ] Install: `next`, `react`, `react-dom`, `@clerk/nextjs`, `convex`, `@convex-dev/react`, `zod`, `playwright` (or `puppeteer` if running locally/on specific VPS env)
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_DEPLOYMENT`, `VPS_API_KEY` (or equivalent for serverless), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`

### 3. Database Schema
- [ ] Structure:
    *   `profiles`: `_id: Id<'profiles'>`, `userId: string`, `platform: 'instagram' | 'tiktok'`, `handle: string`, `status: 'active' | 'paused' | 'error'`, `schedule: 'daily' | 'hourly'`, `lastCrawled: number | null`, `url: string`, `clientId: Id<'clients'>` (for row-level security and client overview)
    *   `posts`: `_id: Id<'posts'>`, `profileId: Id<'profiles'>`, `userId: string`, `platform: 'instagram' | 'tiktok'`, `postId: string` (platform-specific ID), `postUrl: string`, `videoUrl: string | null`, `imageUrl: string | null`, `caption: string | null`, `publishedAt: number`, `crawledAt: number`
    *   `performance_metrics`: `_id: Id<'performance_metrics'>`, `profileId: Id<'profiles'>`, `userId: string`, `platform: 'instagram' | 'tiktok'`, `timestamp: number`, `followers: number | null`, `likes: number | null`, `comments: number | null`, `views: number | null`, `engagementRate: number | null`
    *   `selectors`: `_id: Id<'selectors'>`, `platform: 'instagram' | 'tiktok'`, `version: number`, `type: 'postUrl' | 'likes' | 'comments' | 'followers'`, `cssSelector: string`, `lastUsed: number`, `successRate: number`
    *   `crawl_history`: `_id: Id<'crawl_history'>`, `profileId: Id<'profiles'>`, `userId: string`, `timestamp: number`, `durationMs: number`, `status: 'success' | 'failure'`, `errorMessage: string | null`, `screenshotUrl: string | null`

### 4. Backend Functions
- [ ] Functions (Convex):
    *   `profiles.createProfile`: Add new profile for monitoring
    *   `profiles.updateProfileStatus`: Pause/resume profile monitoring
    *   `profiles.removeProfile`: Delete a profile and associated data
    *   `profiles.getProfiles`: Query profiles by user, status, platform
    *   `profiles.getProfilesDueForCrawl`: Query profiles whose `lastCrawled` is older than `schedule`
    *   `posts.storePost`: Store individual post data
    *   `posts.getPostsByProfile`: Retrieve posts for a given profile
    *   `performance_metrics.storeMetric`: Store time-series performance data
    *   `performance_metrics.getMetricsByProfile`: Retrieve metrics for a given profile and time range
    *   `selectors.getLatestSelectors`: Retrieve active CSS selectors for a platform
    *   `selectors.updateSelectorSuccessRate`: Update success rate after crawl attempt
    *   `crawl_history.logCrawl`: Log each crawl attempt
    *   `crawl_history.getCrawlHistoryByProfile`: Retrieve crawl logs for a profile
- [ ] Actions (Convex):
    *   `crawl.triggerScrape`: Calls external VPS/serverless API with profile details and selectors
    *   `crawl.processScrapeResult`: Receives results from VPS/serverless, stores posts/metrics, updates crawl history, uploads screenshot to R2
- [ ] Schedulers (Convex):
    *   `scheduler.runCrawl`: Runs every 5 minutes, calls `profiles.getProfilesDueForCrawl`, and then `crawl.triggerScrape` for each.
- [ ] Row-Level Security: Implement `auth.userId` checks in all Convex queries and mutations to ensure users only access their own data.

### 5. Frontend
- [ ] Components:
    *   `ProfileManagement`: CRUD operations for profiles (add, remove, pause, resume)
    *   `ProfileDashboard`: Displays aggregated data (follower trends, engagement rates)
    *   `PostFeed`: Shows recent posts from monitored profiles
    *   `CrawlHistoryTable`: Displays recent crawl attempts and statuses
    *   `ClientOverviewDashboard`: (for brands) Displays client-specific profile insights.
- [ ] State: React Context or Zustand/Jotai for global profile list and filtering. `useQuery` from `@convex-dev/react` for data fetching.

### 6. Error Prevention
- [ ] API errors: Robust `try-catch` blocks in Convex Actions and VPS/serverless functions. Implement retry mechanisms for external API calls.
- [ ] Validation: Zod schemas for all Convex mutations and API inputs to ensure data integrity.
- [ ] Rate limiting: Implement delays and exponential backoffs in scraping logic to avoid hitting platform-specific rate limits. Use IP rotation if necessary for large-scale scraping.
- [ ] Auth: Clerk for user authentication; Convex row-level security rules.
- [ ] Type safety: TypeScript throughout the application (Convex schema, frontend components).
- [ ] Boundaries: Clear separation of concerns between Convex (data/business logic), Next.js (UI/API routes), and VPS/serverless (scraping execution).

### 7. Testing
- [ ] Unit tests: Convex functions, Zod schemas, utility helpers.
- [ ] Integration tests: End-to-end flow from adding a profile, triggering a crawl, storing data, to displaying on the frontend.
- [ ] Scraping robustness tests: Test against different profile types, private profiles (expect graceful failure), changes in platform HTML structure, and anti-bot measures.