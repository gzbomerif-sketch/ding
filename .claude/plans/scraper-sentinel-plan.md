# Roadmap: Scraper Sentinel

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Scraper Sentinel, an admin monitoring dashboard for a custom-built web scraping solution. The custom scraper targets Instagram and TikTok for creator-posted content, manages selector versions, uses a VPS, Docker, Chromium, and Redis queue, and aims for a $5-10/month infrastructure cost for 1000+ accounts.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Provision a Virtual Private Server (VPS) instance.
- [ ] Configure Docker on the VPS.
- [ ] Set up a Redis instance on the VPS or as a managed service.
- [ ] Configure Instagram and TikTok accounts/API access (if applicable, for public data collection within TOS).
- [ ] Obtain API keys/credentials for any chosen proxy services (if used to manage rate limits).
- [ ] Create Clerk account for user authentication.

### 2. Dependencies & Environment
- [ ] Install: `next`, `react`, `react-dom`, `@clerk/nextjs`, `convex`, `@tanstack/react-query` (for client-side data fetching/caching if needed, though Convex covers much of this).
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_DEPLOYMENT_URL`, `SCRAPER_API_BASE_URL` (for the custom scraper's internal API), `SCRAPER_API_KEY`, `REDIS_URL`.

### 3. Database Schema (Convex)
- [ ] `crawl_history`: `{ platform: string, creatorId: string, jobId: string, status: "success" | "failed" | "retrying", startTime: number, endTime: number | null, errorMessage: string | null, dataPointsCollected: number, selectorVersion: string, cost: number, vpsMetrics: { cpu: number, memory: number } | null }`
- [ ] `selectors`: `{ platform: string, version: string, definition: string, isActive: boolean, lastUpdated: number, successRate: number, errorRate: number }`
- [ ] `scraper_status`: `{ queueLength: number, activeJobs: number, lastHeartbeat: number, vpsResources: { cpuLoad: number, memoryUsage: number, diskUsage: number } | null, totalCostEstimate: number }`
- [ ] `alerts`: `{ type: "scraper_error" | "selector_update" | "vps_critical", message: string, timestamp: number, isResolved: boolean, jobId: string | null }`

### 4. Backend Functions (Convex & Next.js API Routes for Scraper Interface)
- [ ] **Custom Scraper Service (External to Next.js/Convex initially, exposes API):**
    - [ ] `POST /api/scraper/jobs`: Initiates a new scraping job.
    - [ ] `GET /api/scraper/jobs/:jobId/status`: Retrieves status and basic logs for a job.
    - [ ] `GET /api/scraper/jobs/:jobId/data`: Fetches extracted data for a successful job.
    - [ ] `POST /api/scraper/jobs/:jobId/retry`: Triggers a retry for a failed job.
    - [ ] `GET /api/scraper/selectors`: Retrieves available selector versions.
    - [ ] `POST /api/scraper/selectors/update`: Updates a selector version.
    - [ ] `GET /api/scraper/health`: Provides current scraper system health (queue, VPS, etc.).
- [ ] **Next.js API Routes (for internal communication with custom scraper):**
    - [ ] `GET /api/internal/scraper-status`: Proxies requests to `GET /api/scraper/health` and stores relevant data in `scraper_status` table in Convex. (Protected by internal API key).
    - [ ] `POST /api/internal/scraper-job`: Receives job completion/failure webhooks from the custom scraper and updates `crawl_history` table in Convex. (Protected by internal API key).
- [ ] **Convex Functions (for Scraper Sentinel logic):**
    - [ ] `query.scraper.getDashboardMetrics`: Fetches aggregated data (error rates, success rates, queue status, current VPS metrics) from `crawl_history`, `selectors`, `scraper_status`.
    - [ ] `query.scraper.getCrawlHistory`: Retrieves detailed `crawl_history` entries for specific platforms/creators.
    - [ ] `query.scraper.getSelectorHealth`: Lists all selectors and their aggregated success/error rates from `selectors`.
    - [ ] `mutation.scraper.triggerRetry`: Calls `POST /api/internal/scraper-job/:jobId/retry` via Next.js API route.
    - [ ] `mutation.scraper.updateSelector`: Calls `POST /api/internal/scraper-selector/update` via Next.js API route.
    - [ ] `mutation.scraper.resolveAlert`: Marks an alert in `alerts` as resolved.
    - [ ] `action.scraper.monitorAndAlert`: Scheduled action to periodically call `GET /api/internal/scraper-status`, analyze `crawl_history` for anomalies, and create `alerts` entries. Can trigger external notifications (e.g., email via a third-party service).

### 5. Frontend (Next.js)
- [ ] **Layouts & Pages:**
    - [ ] `src/app/(dashboard)/scraper-sentinel/page.tsx`: Main Scraper Sentinel dashboard.
- [ ] **Components:**
    - [ ] `ScraperHealthCard`: Displays overall status (queue length, active jobs, VPS metrics).
    - [ ] `PlatformErrorRateChart`: Visualizes error rates by platform (Instagram, TikTok).
    - [ ] `SelectorHealthTable`: Lists selectors, versions, success rates, and allows triggering updates/retries.
    - [ ] `CrawlHistoryTable`: Displays recent crawl jobs with status, duration, data collected.
    - [ ] `AlertsList`: Shows active and resolved scraper-related alerts.
    - [ ] `ScraperControls`: Buttons to trigger manual actions (e.g., force re-crawl, update specific selector).
- [ ] **State:**
    - [ ] Use `useQuery` from Convex for real-time data fetching from backend functions.
    - [ ] Local UI state for table filtering, pagination, and loading indicators.

### 6. Error Prevention
- [ ] **API errors:** Implement robust `try-catch` blocks and `error` handling in Convex functions and Next.js API routes when calling the custom scraper's API.
- [ ] **Validation:** Input validation on all API requests (e.g., job IDs, selector versions).
- [ ] **Rate limiting:** Implement circuit breaker patterns and exponential backoff in the custom scraper to handle target platform rate limits. Convex actions polling the scraper should also respect thresholds.
- [ ] **Auth:** Clerk for user authentication/authorization for accessing the Scraper Sentinel dashboard. Internal API keys for communication between Next.js API routes and the custom scraper service.
- [ ] **Type safety:** End-to-end type safety using TypeScript, including Convex schema definitions and inferred types.
- [ ] **Boundaries:** Clear separation of concerns between Next.js (UI, API proxies), Convex (state management, server-side logic, scheduled tasks), and the custom scraper service (core scraping logic, VPS management).

### 7. Testing
- [ ] **Unit Tests:** For Convex functions, Next.js API routes, and React components.
- [ ] **Integration Tests:** Verify data flow from custom scraper to Next.js API route to Convex, and then to the frontend.
- [ ] **E2E Tests:** Simulate an admin user viewing the dashboard, triggering a retry, and observing status updates.
- [ ] **Load Testing (for custom scraper):** Evaluate scraper performance and resilience under various load conditions to ensure it can handle 1000+ accounts within the budget and platform rate limits.