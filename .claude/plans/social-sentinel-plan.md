The search results confirm my initial assessment: "Custom" refers to a custom-built web scraping solution. The results provide valuable insights into Playwright for Instagram/TikTok scraping, self-healing selectors, distributed queues with Redis, Next.js integration with a backend, and anti-bot techniques.

Let's synthesize the research findings for each point:

### 1. Understand Custom API capabilities and limitations for Social Sentinel

**Capabilities (what *we will build*):**
*   **Data Extraction:**
    *   Instagram Reels & TikTok posts: Views, likes, comments, shares.
    *   Profile data: Username, name, picture, bio, followers.
    *   Post details: URL, caption, hashtags, date, thumbnail, metrics, TikTok video.
*   **Automation:**
    *   Playwright on Dockerized VPS instances for browser automation.
    *   Scheduled crawls (e.g., every 30 mins for updates, daily for full profiles).
    *   Queue-based task distribution (Redis) for scalability and reliability.
*   **Self-Healing:**
    *   Detection of selector failures.
    *   HTML analysis to find new candidate selectors.
    *   Testing of new selectors (trial 10x, keep if 80%+ success).
    *   Rollback mechanism if new selectors fail (<50% success).
    *   Management of multiple selector versions.
*   **Resilience & Anti-Detection:**
    *   Anti-bot measures (user-agent randomization, viewport, locale, timezone, WebGL/hardware acceleration, proxies, disabling automation flags, `playwright-stealth` if using Node.js/Python versions that support it).
    *   Circuit breaker, 3x retry with backoff for failed requests.
    *   Distributed lock for selector updates.
*   **Monitoring & Management:**
    *   Dashboard for errors, stats, costs, VPS status (real-time).
    *   Profile management: add/remove/pause/resume/retry.
    *   Storage for scraped data (profiles, posts, metrics), selectors, crawl history, and screenshots (R2).

**Limitations (inherent to web scraping):**
*   **Platform Changes:** Instagram and TikTok frequently update their UI/HTML, leading to broken selectors, even with self-healing (it's a reactive process).
*   **Anti-Bot Measures:** Social media platforms employ sophisticated anti-bot technologies (e.g., CAPTCHAs, IP bans, rate limiting, advanced fingerprinting) that constantly evolve, requiring continuous effort to bypass.
*   **Rate Limits:** Platforms impose limits on how many requests can be made from a single IP or user, necessitating proxies and distributed infrastructure.
*   **ToS Violations:** Web scraping can violate the terms of service of Instagram and TikTok, potentially leading to IP bans or account suspensions. This is a significant legal and ethical consideration.
*   **Data Accuracy & Completeness:** Data might be incomplete or delayed due to scraping challenges. Real-time, perfect data is hard to guarantee.
*   **Resource Intensiveness:** Running multiple Playwright browsers on VPS instances can be resource-intensive (CPU, RAM, network), impacting costs. The $5-10/mo VPS cost for 1000+/day profiles seems highly optimistic for a robust self-healing Playwright setup.
*   **Authentication:** The prompt implies public data, but if logged-in access is ever required, managing accounts securely and avoiding suspension becomes an even bigger challenge.

### 2. Find Custom Social Sentinel documentation and setup guides

Since it's a custom build, the "documentation" would be internal. Key areas for internal documentation would include:
*   **System Architecture Diagram:** Showing the flow between Next.js, Convex, Redis, VPS workers, R2.
*   **API Specification:** Endpoints for interacting with the scraping service (e.g., `triggerCrawl`, `getProfileData`, `updateSelector`, `getScrapingStatus`).
*   **Deployment Guide:** Instructions for setting up VPS, Docker, Playwright, Redis, and configuring environment variables.
*   **Database Schema Definition:** For profiles, posts, metrics, selectors, crawl history.
*   **Self-Healing Logic Documentation:** Detailed explanation of the failure detection, analysis, testing, and rollback process.
*   **Anti-Bot Strategy Document:** Detailing current techniques, proxy management, and common issues.
*   **Monitoring & Alerting Setup:** How to configure dashboards and alerts for system health.

### 3. Research Custom Social Sentinel Next.js integration patterns

Next.js will primarily act as the client and potentially a thin API gateway to trigger and retrieve data from the dedicated scraping backend.
*   **Next.js API Routes / Server Actions:** These can be used to expose endpoints that the frontend calls. These endpoints would then invoke Convex functions, which in turn could communicate with the external scraping service.
*   **Convex Functions (Mutations/Queries):** Convex can serve as the primary backend for the Next.js app, storing scraped data and orchestrating calls to the external scraping service.
    *   **Mutations:** To initiate a crawl for a profile (e.g., `convex/mutations/startScrape.ts` which queues a task for the external scraper).
    *   **Queries:** To fetch profile data, post data, performance metrics, and system status from the Convex database for the dashboard.
    *   **Scheduled Functions/Actions:** Convex allows background functions/actions which could periodically check the status of the scraping queue, process results from the scraping service, or even trigger the external scheduler.
*   **External Scraping Service:** This service (VPS with Playwright/Docker/Redis) will run independently.
    *   It will expose its own API (e.g., REST API) for:
        *   Receiving scrape requests (e.g., add profile to queue).
        *   Reporting scrape results (e.g., push new data to Convex via a Convex mutation or a webhook).
        *   Reporting service health/status.
    *   Alternatively, Convex's background functions could directly interact with the Redis queue to push tasks, and the scraping workers could push results directly back to Convex via mutations/actions.
*   **Data Flow:**
    1.  User in Next.js app adds a profile.
    2.  Next.js calls a Convex mutation (`addProfile`).
    3.  Convex stores profile, then calls another Convex mutation/action (`queueScrapeTask`) which either directly adds to Redis or calls the external scraping service API to add to its Redis queue.
    4.  VPS workers pick tasks from Redis.
    5.  Workers scrape data, store it in R2 (screenshots) and send processed data back to Convex (via Convex mutation/webhook or by populating a dedicated Convex table that the Next.js app queries).
    6.  Next.js dashboard queries Convex for display.

### 4. Identify authentication methods, rate limits, and pricing considerations

*   **Authentication:**
    *   **Next.js <-> Convex <-> Scraping Backend:**
        *   Clerk handles user authentication for the Next.js app.
        *   Convex functions can be protected by Clerk authentication rules.
        *   Convex interacting with the external scraping service should use secure API keys/tokens (stored as Convex environment variables).
        *   The external scraping service should validate these keys for incoming requests (e.g., to add a profile to the queue or update selectors).
    *   **Scraping Backend <-> Instagram/TikTok:** The prompt implies public data, so direct account login might not be strictly necessary, which simplifies things. If it were, managing session cookies, user agents, and avoiding detection as a bot account would be critical. For public data, the focus is on IP rotation and anti-bot techniques.
*   **Rate Limits:**
    *   **Instagram/TikTok:** Crucial to implement throttling and backoff strategies within the scraping service to avoid IP bans. This involves rotating proxies and respecting delays. The Redis queue and circuit breaker will help manage this.
    *   **Internal Scraping Service:** The Redis queue itself acts as a rate limiter, processing 5 concurrent tasks. The scheduler every 5 minutes ensures tasks are continually fed.
    *   **Convex:** Be mindful of Convex write/read limits. Batching updates for performance metrics and posts could be beneficial.
*   **Pricing:**
    *   **VPS:** The $5-10/mo cost mentioned is very low for running 5 Playwright browsers with Docker and anti-bot measures, especially for scaling to 1000+ profiles/day. Realistic costs for sufficiently powerful VPS instances (e.g., 4-8 vCPU, 8-16GB RAM) capable of handling this load and running multiple browsers concurrently would likely be much higher ($50-200+/mo per VPS, and potentially multiple VPS instances).
    *   **Redis:** Managed Redis service (e.g., Redis Cloud, AWS ElastiCache) will incur costs, especially for a production-grade, highly available setup.
    *   **R2 Storage (Cloudflare R2):** Very cost-effective for screenshots and raw HTML.
    *   **Convex:** Pricing based on data storage, reads, writes, and background functions.
    *   **Proxies:** Essential for avoiding IP bans, these are a significant ongoing cost and crucial for the system's reliability.

### 5. Look for best practices and common implementation pitfalls

**Best Practices:**
*   **Robust Selectors:** Prioritize user-facing attributes, `data-*` attributes, and relative selectors over brittle class names or deeply nested paths.
*   **Playwright Stealth:** Use libraries/techniques to mimic human behavior (user agents, viewport, WebGL, disabling `navigator.webdriver`).
*   **Proxy Management:** Implement a rotating proxy pool (residential proxies are generally better) to distribute requests and avoid IP bans.
*   **Error Handling & Retries:** Implement robust retry logic with exponential backoff and circuit breakers for network requests and scraping failures.
*   **Distributed Queue:** Use Redis for task queuing and deduplication to manage load and ensure reliability.
*   **Idempotency:** Ensure that processing a task multiple times (due to retries) doesn't cause incorrect data or side effects.
*   **Headless vs. Headful:** While headless is efficient, headful mode can sometimes help bypass detection during development or for particularly tricky sites.
*   **Monitoring & Alerting:** Comprehensive logging and real-time dashboards are critical for detecting issues, monitoring costs, and understanding performance.
*   **Modular Architecture:** Separate the scraping logic from the core application logic. The VPS workers should be independent services.
*   **Legal & Ethical Compliance:** Adhere to platform ToS, privacy policies, and data protection regulations (e.g., GDPR, CCPA). Only scrape publicly available data.

**Common Pitfalls:**
*   **Fragile Selectors:** Over-relying on dynamically generated or frequently changing CSS classes.
*   **Lack of Anti-Bot Measures:** Getting IP banned or throttled quickly without proper user-agent rotation, proxies, and behavioral mimicry.
*   **Ignoring Rate Limits:** Aggressive scraping without delays or backoff.
*   **Single Point of Failure:** A non-distributed scraping setup, where one crashed worker brings down the whole process.
*   **Inefficient Resource Usage:** Running too many browser instances on an underpowered VPS, leading to crashes or slow performance.
*   **Poor Error Reporting:** Not having visibility into why scrapes are failing.
*   **No Self-Healing/Maintenance:** Scrapers breaking every time the target website updates, requiring manual intervention.
*   **Legal Issues:** Scraping private data or data in violation of ToS.
*   **Overly Complex Logic:** Trying to build too much intelligence into the self-healing at once; start simple and iterate.

Now, let's create the roadmap based on this comprehensive understanding. The roadmap will assume the "Custom" part is a separate, dedicated scraping microservice (running on the VPS) that communicates with Convex.

---
# Roadmap: Social Sentinel

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Social Sentinel with Custom (self-built Instagram/TikTok performance monitor)

## Implementation Steps

### 1. External Scraping Service (VPS) Setup
- [ ] Provision VPS instances (consider resources for 5 concurrent browsers, Docker, Redis).
- [ ] Install Docker and Docker Compose on VPS.
- [ ] Deploy a Redis instance on VPS for the task queue.
- [ ] Set up a dedicated scraping service repository (e.g., Node.js or Python) with Playwright.
- [ ] Implement initial Playwright scripts for Instagram/TikTok profile and post data extraction.
- [ ] Integrate anti-bot measures (user-agent rotation, viewport, locale, timezone, disabling `navigator.webdriver`).
- [ ] Configure proxy rotation within the scraping service.
- [ ] Implement a task processing loop that reads from Redis queue, executes Playwright tasks, and handles retries/backoff.
- [ ] Develop a mechanism for scraping workers to report results (success/failure, extracted data) back to Convex (e.g., via Convex `mutation` call or webhook to a Convex `action`).
- [ ] Implement R2 storage integration for screenshots (<100KB) and raw HTML responses.

### 2. Dependencies & Environment
- [ ] **Next.js:**
    - [ ] Install: `@clerk/nextjs`, `@convex-dev/react`, `convex`.
- [ ] **Convex:**
    - [ ] No direct client-side installs beyond React SDK.
- [ ] **External Scraping Service (Example Node.js):**
    - [ ] Install: `playwright`, `ioredis` (for Redis client), `dotenv`, `axios` (for Convex API calls), `playwright-extra` & `puppeteer-extra-plugin-stealth` (if using stealth).
- [ ] **Environment Variables:**
    - [ ] `.env.local` (Next.js): `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
    - [ ] Convex Dashboard: `SOCIAL_SENTINEL_API_KEY` (for scraping service authentication), `REDIS_URL` (if Convex needs to connect to Redis directly for certain operations).
    - [ ] VPS / Docker (Scraping Service): `CONVEX_DEPLOYMENT_URL`, `CONVEX_ADMIN_KEY` (for mutations/actions), `REDIS_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `PROXY_API_KEY_OR_ENDPOINT`.

### 3. Database Schema (Convex)
- [ ] **`profiles` table:**
    - `_id: Id<'profiles'>`
    - `userId: Id<'users'>` (Clerk user ID or Convex user ID)
    - `platform: 'instagram' | 'tiktok'`
    - `username: string` (indexed)
    - `name: string`
    - `profilePictureUrl: string`
    - `bio: string`
    - `followers: number`
    - `status: 'active' | 'paused' | 'error'`
    - `lastScraped: number` (timestamp)
    - `nextScrape: number` (timestamp for scheduler)
    - `lastError: string` (optional)
- [ ] **`posts` table:**
    - `_id: Id<'posts'>`
    - `profileId: Id<'profiles'>` (indexed)
    - `postId: string` (unique identifier from platform, indexed)
    - `postUrl: string`
    - `caption: string`
    - `hashtags: string[]`
    - `postDate: number` (timestamp)
    - `thumbnailUrl: string`
    - `videoUrl: string` (for TikTok)
    - `metricsLastUpdated: number` (timestamp)
- [ ] **`performance_metrics` table:**
    - `_id: Id<'performance_metrics'>`
    - `postId: Id<'posts'>` (indexed)
    - `timestamp: number` (indexed)
    - `views: number`
    - `likes: number`
    - `comments: number`
    - `shares: number`
- [ ] **`selectors` table:**
    - `_id: Id<'selectors'>`
    - `platform: 'instagram' | 'tiktok'` (indexed)
    - `elementType: 'profile_followers' | 'post_views' | ...` (specific elements to scrape)
    - `currentSelector: string` (CSS selector string)
    - `version: number`
    - `lastUpdated: number`
    - `status: 'active' | 'testing' | 'rollback'`
    - `candidateSelectors: string[]` (for self-healing, potential new selectors)
    - `testResults: { selector: string, successRate: number, timestamp: number }[]`
- [ ] **`crawl_history` table:**
    - `_id: Id<'crawl_history'>`
    - `profileId: Id<'profiles'>` (indexed)
    - `timestamp: number`
    - `status: 'success' | 'failure'`
    - `errorMessage: string` (optional)
    - `duration: number` (in ms)
    - `postsScraped: number`
    - `screenshotR2Key: string` (optional key to R2 for error screenshots)
- [ ] **`system_status` table:** (for dashboard monitoring)
    - `_id: Id<'system_status'>`
    - `component: 'vps_worker_1' | 'redis_queue' | 'selector_healing_agent'`
    - `status: 'ok' | 'warning' | 'error'`
    - `lastCheck: number`
    - `details: string`
    - `metrics: object` (e.g., CPU usage, memory, queue depth)

### 4. Backend Functions (Convex)
- [ ] **`convex/mutations/addProfile.ts`:**
    - Purpose: Add a new social media profile to be monitored.
    - Logic: Stores profile data in `profiles` table, then triggers a `startScrapeTask` action.
    - Auth: Requires authenticated user.
- [ ] **`convex/actions/startScrapeTask.ts`:**
    - Purpose: Orchestrate a scrape job by pushing to Redis queue or calling external scraping service API.
    - Logic: Receives `profileId`, pushes to Redis queue with necessary metadata or makes authenticated API call to external scraper. Handles API key for external service.
    - Auth: Protected by internal Convex rules (e.g., `internalMutation`).
- [ ] **`convex/actions/handleScrapeResult.ts`:**
    - Purpose: Receive and process results from the external scraping service. This can be exposed as a webhook endpoint or called directly by the scraper.
    - Logic: Updates `profiles`, `posts`, `performance_metrics`, `crawl_history` tables based on incoming data. Handles errors and stores them.
    - Auth: Requires `SOCIAL_SENTINEL_API_KEY` for authentication.
- [ ] **`convex/queries/getProfiles.ts`:**
    - Purpose: Fetch all or filtered profiles for the dashboard.
    - Auth: Requires authenticated user.
- [ ] **`convex/queries/getProfileDetails.ts`:**
    - Purpose: Fetch detailed data for a single profile (profile info, recent posts, performance metrics).
    - Auth: Requires authenticated user.
- [ ] **`convex/queries/getSystemStatus.ts`:**
    - Purpose: Fetch real-time system health and stats for the admin dashboard.
    - Auth: Requires admin role.
- [ ] **`convex/mutations/updateProfileStatus.ts`:**
    - Purpose: Allow users to pause/resume/remove/retry profiles.
    - Logic: Updates `status` field in `profiles` table, potentially triggers `startScrapeTask` for retry.
    - Auth: Requires authenticated user.
- [ ] **`convex/mutations/updateSelector.ts`:**
    - Purpose: Endpoint for the self-healing agent to propose and update selectors.
    - Logic: Updates `selectors` table, manages versions, test results, and status. Implements distributed lock logic (Convex Transactions or external lock if Convex doesn't support fine-grained locks).
    - Auth: Requires `SOCIAL_SENTINEL_API_KEY`.
- [ ] **`convex/cron/scheduler.ts`:**
    - Purpose: Periodically check profiles that need scraping and trigger `startScrapeTask` actions.
    - Logic: Queries `profiles` table for `nextScrape` due. Invokes `startScrapeTask` for each. Implements auto-recovery by re-queuing missed tasks.
- [ ] **`convex/cron/selfHealingCheck.ts`:**
    - Purpose: Periodically trigger the self-healing logic for selectors.
    - Logic: Invokes an external self-healing agent or triggers an action that performs the HTML analysis, testing, and update process.
- [ ] **`convex/actions/uploadScreenshot.ts`:**
    - Purpose: Receive error screenshots from the scraping service and upload to R2 (via Convex's file storage or directly from the client if using pre-signed URLs).
    - Logic: Stores a reference in `crawl_history` and returns R2 URL.
    - Auth: Requires `SOCIAL_SENTINEL_API_KEY`.

### 5. Frontend (Next.js)
- [ ] **Layout & Navigation:**
    - User Dashboard: Overview of managed profiles, campaign performance.
    - Influencer Dashboard: Campaign assignments, earnings, payment tracking (future integration with campaign budget).
    - Admin/Team Dashboard: Social Sentinel monitoring, profile management.
- [ ] **Components:**
    - `ProfileListings`: Displays a list of monitored profiles with their status and key metrics. Allows adding new profiles.
    - `ProfileDetails`: Shows detailed profile data, post list, and performance graphs (views, likes over time).
    - `ScrapeProgressIndicator`: Real-time updates on active scrapes or queue depth (using Convex queries subscribing to `system_status` or derived data).
    - `SystemStatusDashboard`: Displays VPS status, Redis queue depth, error logs, and selector self-healing status (admin view).
    - `AddProfileForm`: Form to input Instagram/TikTok profile URLs.
    - `HistoricalPerformanceChart`: Chart component to visualize trends over time from `performance_metrics`.
- [ ] **State:**
    - Global state (React Context/Zustand/Jotai) for user authentication (`Clerk`), active profile, and system-wide notifications.
    - Local component state for forms, pagination, filtering.
    - Convex query hooks for reactive data fetching from the Convex database, ensuring real-time updates for dashboards.

### 6. Error Prevention
- [ ] **API errors:**
    - Implement robust `try-catch` blocks in Convex functions and scraping service.
    - Standardize error response formats (Convex functions, external scraping service).
    - Log errors comprehensively in `crawl_history` and `system_status` tables, including stack traces and relevant context.
    - Use `R2` for storing error screenshots from the scraping service.
- [ ] **Validation:**
    - Frontend input validation (e.g., valid Instagram/TikTok URL, username format).
    - Convex mutation validation (e.g., ensuring `profileId` exists, data types are correct).
    - Scraping service input validation (e.g., valid target URL).
- [ ] **Rate limiting:**
    - Implement within scraping service (e.g., per-proxy, per-platform delays).
    - Circuit breaker pattern in scraping service to prevent hammering blocked targets.
    - Exponential backoff for retries.
    - Convex functions should use internal rate limiting or be designed to handle concurrent calls without overloading external services.
- [ ] **Auth:**
    - Clerk for Next.js user authentication.
    - Convex `auth` rules for protecting mutations and queries based on user roles (e.g., only admin can view `SystemStatusDashboard`).
    - API keys/tokens for secure communication between Convex actions and the external scraping service.
- [ ] **Type safety:**
    - Extensive use of TypeScript across Next.js, Convex, and the scraping service.
    - Generated Convex types for database schema.
    - Define clear interfaces for data transfer between components and services.
- [ ] **Boundaries:**
    - Clear separation of concerns: Next.js (UI), Convex (backend data & orchestration), external scraping service (execution of scraping tasks).
    - Timeouts for Playwright operations and external API calls (e.g., 60s for 30 posts, 10-20s for updates).
    - Memory/CPU limits on Docker containers for Playwright browsers on VPS.

### 7. Testing
- [ ] **Unit Tests:**
    - Convex functions (mutations, queries, actions) using Convex testing utilities.
    - Scraping service individual modules (e.g., selector parsing, anti-bot logic).
- [ ] **Integration Tests:**
    - Next.js frontend interacting with Convex backend.
    - Convex actions triggering/receiving from the external scraping service.
    - Scraping worker picking a task from Redis and attempting a scrape.
- [ ] **End-to-End Tests (E2E):**
    - Simulating a user adding a profile and verifying data appears on the dashboard.
    - Testing the self-healing process for a simulated selector break.
    - Full crawl cycle (enqueue, scrape, process, display).
- [ ] **Performance Tests:**
    - Load testing the scraping service with many concurrent tasks to ensure scalability (1000+/day).
    - Monitoring resource usage on VPS during load.
- [ ] **Resilience Tests:**
    - Simulate network failures, proxy failures, target website changes, and verify error handling and self-healing.
    - Test circuit breaker and retry mechanisms.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. reddit.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGcBTm4QCFekBN2-BUOIe2h5r8d9Ji1-28YCLl0aIJePS5N4FKePf3KWDbSIhT42QRPaxzbpHXr3IbWbkTeIf3DNX818cjjbBHpYIfFMUYKVocC6JvXbxuyHd6gtVgKwnBjfmtPTTrEsjyywGcs3USIl_NcdkpXxgUdskRYW9fpzL--JBqzsFjeoAYkCPJlaSc878BAevUCxAUXelbqJoU=
2. reddit.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQF7oQ0Dgc8vGwSII2VM4OqOe_hhw0WFRLcZ1OIM7V7QHkNt5wCV0H7p3plX7t71A1VJUfO0AEVlbYrrCOdh-2KkmIyEgICz1SS_k8fWJaDU1yngaUZWPwvsO5dK-F8PrkYorJ1Ad53oz3P-1O1-kPzhZkoOl2Ja0vmXGW53QThVQmO5EkxnP5sb0F3lQeynr1vWoVLH1sUqPTBNOQ==
3. medium.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFpMjGlXNFFJSafD2JmpBra-RpdMwa12c3wwRpcRPmuOWiDEpgMqMvvdwv9MAQ1PbVaXbrzwBdkOfA82RqRWJRMFI0DjjV297HP4QUqLCBlM0roPCE3Aza6Yg_byP7Ify6A1J52y9oC0Acln8oDFhKsNQnEZwU8XmhsOgZ8B-INHC4cJLHSMcUNYrDtUJYNh4Bl5ZaUQ0EeSckI-HwkUCk36VIm_rhRkQvsW_j4-oY0xre0mrqov-2w-SLu1lE1InI=
4. playwright.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGk23iKXTHHeeHAZgvTFNH1yib2BEvJn_9PaJ-yzqg6X0V7uF2CXfpdB9M0D6Wq7-cddDesHVdDdolfg8gry234cCL2UR-2b3SkZeAFJuIYsGHN8OUPqvN_uswYnNWER2o617AriQ==
5. medium.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGL16EKh4g_NoxkWm5ywqci8u_L8rn5qqT_BsyoEsNUfb-gQ9Qw9A3_-uzcicgblpnf-ORKhYWydRm_9na6UVRdiO0REMN3VhqGuPI_RHfLTfikoB6rcXrOCDTt4NpvqQFakXwl9fosRVLLXDIF7vN7KwbPQpXTgCpRykKvTFc8HOy_syM1T559QwjU3uh8R4vOeg==
