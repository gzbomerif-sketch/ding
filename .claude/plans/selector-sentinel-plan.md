# Roadmap: Selector Sentinel

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Selector Sentinel with Custom (interpreted as a custom-built selector detection and regeneration system)
- Purpose: Automatically detects when Instagram/TikTok HTML changes, finds new CSS selectors (prioritizing `data-*`, `aria-*`, classes, XPath), tests them, and manages versions to ensure continuous data extraction for creator marketing and campaign management.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account and project.
- [ ] Create Clerk account and configure for Next.js.
- [ ] Configure `NEXT_PUBLIC_CONVEX_URL` and Clerk environment variables.
- [ ] Set up a headless browser execution environment (e.g., Vercel Functions with Playwright, or a dedicated scraping server if Vercel limitations are hit) or integrate with a managed headless browser API.
- [ ] Create OpenAI (or preferred LLM) account and generate API keys.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `next`, `react`, `react-dom`, `typescript`, `@types/react`, `@types/node`, `tailwindcss`, `postcss`, `autoprefixer`, `@clerk/nextjs`, `@ai-sdk/openai`, `playwright-chromium` (or `puppeteer`).
- [ ] Env vars: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `OPENAI_API_KEY`.

### 3. Database Schema
- [ ] **`selectors` Table:**
    - `platform`: "Instagram" | "TikTok" (string)
    - `metricName`: e.g., "postEngagementCount", "followerCount" (string)
    - `currentSelector`: string (the currently active CSS/XPath selector)
    - `lastSuccessfulCrawlAt`: timestamp (number)
    - `failureCount`: number (consecutive failures for this selector)
    - `selectorHistory`: array of objects { `selector`: string, `effectiveFrom`: timestamp, `deprecatedAt`: timestamp | null, `status`: "active" | "inactive" | "tested" }
    - `candidateSelectors`: array of objects { `selector`: string, `generatedAt`: timestamp, `testResults`: array of { `crawlId`: string, `success`: boolean }, `status`: "pending" | "testing" | "failed" }
    - `distributedLockId`: string | null (for preventing concurrent updates to the same selector)
    - `distributedLockExpiry`: timestamp | null
- [ ] **`crawls` Table:**
    - `platform`: "Instagram" | "TikTok" (string)
    - `targetUrl`: string
    - `status`: "pending" | "inProgress" | "success" | "failed" | "retrying" (string)
    - `attemptCount`: number
    - `lastAttemptAt`: timestamp | null
    - `dataExtracted`: object | null
    - `errorDetails`: string | null
    - `selectorVersionUsed`: string (reference to `selectors.currentSelector` or `selectorHistory` entry)

### 4. Backend Functions (Convex)

- [ ] **`selector.getLatestSelector(platform, metricName)`:** Fetches the `currentSelector` for a given metric.
- [ ] **`selector.updateSelector(platform, metricName, newSelector, oldSelectorVersion)`:** Atomically updates `currentSelector`, archives the old one to `selectorHistory`.
- [ ] **`selector.incrementFailureCount(platform, metricName)`:** Increments `failureCount` and potentially triggers `selector.initiateSelectorDetection`.
- [ ] **`selector.acquireLock(platform, metricName)`:** Implements distributed locking using `distributedLockId` and `distributedLockExpiry`.
- [ ] **`selector.releaseLock(platform, metricName)`:** Releases the distributed lock.
- [ ] **`crawl.scheduleCrawl(platform, targetUrl, metricName)`:** Adds a crawl task to `crawls` table.
- [ ] **`crawl.processCrawlTask()`:** (Scheduled/Triggered Function)
    - Acquires a crawl task.
    - Calls external service (Next.js API route) for headless browser execution.
    - Updates `crawls` status.
    - If successful, records `dataExtracted`.
    - If failed: increments `attemptCount`, retries up to 3 times. If failures exceed threshold (3+), calls `selector.incrementFailureCount`.
- [ ] **`selector.initiateSelectorDetection(platform, metricName, failedCrawlHtml)`:** (Triggered by `incrementFailureCount`)
    - Acquires distributed lock for the metric.
    - Calls Next.js API route for `selector.generateCandidates` with `failedCrawlHtml`.
    - Stores generated candidates in `candidateSelectors`.
    - Triggers `selector.testCandidateSelectors`.
- [ ] **`selector.generateCandidates(platform, failedCrawlHtml)`:** (Next.js API Route, called by Convex)
    - Uses `@ai-sdk/openai` to analyze `failedCrawlHtml`.
    - Prompts LLM to identify potential elements for `metricName` and suggest 5-10 CSS/XPath candidates, prioritizing `data-*`, `aria-*`, classes, then XPath.
    - Returns candidate selectors.
- [ ] **`selector.testCandidateSelectors(platform, metricName)`:** (Scheduled/Triggered Function, or called by `initiateSelectorDetection`)
    - Iterates through `candidateSelectors`.
    - For each candidate, schedules 3 "trial crawls" using `crawl.scheduleCrawl` (with specific `selectorVersionUsed`).
    - Aggregates results for each candidate.
    - If a candidate has 80%+ success, promotes it using `selector.updateSelector`.
    - If no candidate succeeds, logs an alert.
    - Releases distributed lock.
- [ ] **`crawl.performHeadlessCrawl(targetUrl, selector, screenshotFlag)`:** (Next.js API Route, called by Convex)
    - Uses Playwright/Puppeteer to navigate to `targetUrl`.
    - Attempts to find element with `selector`.
    - If `screenshotFlag` is true, takes a screenshot.
    - Returns extracted text/attribute or null, and screenshot URL (if taken).

### 5. Frontend
- [ ] **`CampaignDashboard`:** Displays overall campaign performance.
- [ ] **`CreatorInsights`:** Shows aggregated data from Instagram/TikTok.
- [ ] **`SelectorMonitoring` Component:**
    - Displays status of current selectors (active, failed, testing candidates).
    - Shows `failureCount`, `lastSuccessfulCrawlAt`.
    - Visualizes `selectorHistory` (e.g., timeline).
    - Allows manual trigger of selector detection (for admins).
    - Displays `candidateSelectors` and their test results.
    - Provides options for manual approval/rollback to a `selectorHistory` version.
- [ ] **`Alerts` Component:** Notifies admins about critical selector failures or unsuccessful candidate generation.

### 6. Error Prevention
- [ ] **API errors:** Graceful handling of network issues, timeouts, and API specific error codes from Instagram/TikTok (if any), OpenAI, and Convex.
- [ ] **Validation:** Input validation for all Convex functions and Next.js API routes (e.g., valid URLs, platform names, selector formats).
- [ ] **Rate limiting:** Implement exponential backoff for retries against target platforms and AI APIs. Consider proxy rotation for Instagram/TikTok crawls.
- [ ] **Auth:** Enforce Clerk authentication and authorization for all backend operations (e.g., only authenticated admins can trigger manual selector updates or view sensitive monitoring data).
- [ ] **Type safety:** Extensive TypeScript usage across frontend and backend (Convex, Next.js).
- [ ] **Boundaries:** Implement circuit breakers or fallback mechanisms for external API calls (headless browser, AI). Monitor resource usage of headless browser instances to prevent exhaustion.

### 7. Testing
- [ ] **Unit Tests:** For individual Convex functions, Next.js API routes (e.g., selector parsing, lock management).
- [ ] **Integration Tests:**
    - Selector detection flow: Simulate selector failure, verify `initiateSelectorDetection` is triggered, candidates are generated and tested, and `updateSelector` is called.
    - Crawl retries: Verify 3 retry attempts before marking a crawl as ultimately failed.
    - Distributed locking: Test concurrent updates to ensure only one selector update process runs.
    - Headless browser interaction: Test basic page navigation, element selection, and screenshotting.
- [ ] **End-to-End Tests:** Simulate an entire data extraction pipeline from selector stability to data display on the frontend dashboard.
- [ ] **Performance Tests:** Evaluate latency and resource usage of headless browser crawls and AI selector generation.