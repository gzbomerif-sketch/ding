The term "Custom API" in the context of this application refers to a *custom-built social media scraping solution* hosted on a Virtual Private Server (VPS) rather than an integration with a third-party vendor named "Custom." This custom solution will utilize Playwright within a Docker environment to scrape Instagram and TikTok data. The Next.js application, in conjunction with Convex, will interact with this custom scraper via a custom API layer.

## Research Insights:

### 1. Custom API Capabilities and Limitations (for a self-built scraper)
*   **Capabilities**: A custom scraper built with Playwright can emulate a browser, handle JavaScript-rendered content, and bypass many common anti-scraping measures (e.g., dynamic content, basic bot detection) by rotating user agents, adding realistic delays, and managing concurrent sessions. It can extract detailed profile information (username, display name, picture, bio, follower counts) and post data (URL, caption, hashtags, date, thumbnail, metrics, video playback URL for TikTok). The ability to compress screenshots and store them in R2 is achievable.
*   **Limitations & Challenges**:
    *   **Anti-bot Measures**: Social media platforms employ sophisticated detection systems (e.g., CAPTCHAs, IP blocking, rate limiting, account suspension) that require continuous adaptation of the scraper.
    *   **Terms of Service (ToS)**: Scraping often violates platform ToS, carrying legal risks and potential account bans. This needs careful consideration.
    *   **Dynamic Structure Changes**: Social media UIs frequently update, breaking scraper logic and requiring ongoing maintenance.
    *   **Scalability**: Managing proxies, IP rotation, and concurrent browser instances for 1000+ accounts/day is complex and resource-intensive.
    *   **Error Handling**: Robust error handling is crucial for network issues, deleted content, and partial data.
    *   **Resource Management**: Running Playwright browsers on a VPS requires careful management of CPU, RAM, and network resources to prevent crashes.
    *   **Data Quality**: Ensuring data accuracy and completeness despite platform changes and scraping challenges.

### 2. Documentation and Setup Guides (General for custom scraping)
*   **Playwright Documentation**: The official Playwright documentation is the primary resource for browser automation, selectors, and error handling.
*   **Docker Documentation**: Essential for containerizing the Playwright script and Chromium browser on the VPS.
*   **VPS Provider Docs**: For setting up the server, Docker, and network configurations.
*   **Monitoring Tools**: For tracking scraper health, logs, and performance.

### 3. Next.js Integration Patterns (for interacting with a custom backend service)
*   **Next.js API Routes / Route Handlers**: The ideal pattern for building server-side API endpoints within a Next.js application to interact with the external VPS scraper. These act as proxies or orchestrators.
*   **Server Actions**: For directly invoking server-side logic from client components without explicit API routes, suitable for triggering scrape requests.
*   **Fetching Data**: `getServerSideProps`, `getStaticProps` (for static content, less likely for dynamic scrapes), or client-side `fetch` can be used to display scraped data.

### 4. Authentication, Rate Limits, and Pricing Considerations
*   **Authentication**:
    *   **VPS Scraper API**: A simple API key (stored securely in environment variables on Next.js/Convex and the VPS) is sufficient for server-to-server communication between the Next.js backend and the VPS scraper. OAuth could be overkill for a purely internal API.
    *   **Next.js to Convex**: Clerk handles user authentication and session management for the main app.
*   **Rate Limits (Custom Scraper)**: The prompt specifies custom rate limits and delays for the scraper itself (5 concurrent browsers, 2-5s delays, 5 min min between crawls, stop after 5 failures). This logic must be implemented within the VPS scraper.
*   **Pricing (Custom Scraper)**: Costs will involve:
    *   **VPS Hosting**: Based on CPU, RAM, storage, and bandwidth.
    *   **R2 Storage**: For screenshots, charged per GB and operations.
    *   **Development & Maintenance**: Significant ongoing effort for adapting to platform changes, scaling, and error handling.
    *   **Proxy Services**: If additional proxy rotation is needed beyond what's specified, this would be an added cost.

### 5. Best Practices and Common Pitfalls
*   **API Design**: Use consistent naming, clear error messages, appropriate HTTP status codes, and versioning for the Next.js API endpoints communicating with the VPS scraper. Avoid overly complex endpoints.
*   **Error Handling**: Implement robust try-catch blocks in the scraper and API layer, log all errors (categorized), and retry network failures.
*   **Scalability**: Design the scraper for concurrency (as specified), consider a queueing system (e.g., Redis, or Convex's background functions) for scrape requests to prevent overwhelming the VPS, and monitor resource usage.
*   **Security**: Secure API keys, enforce HTTPS, validate all input, and avoid exposing sensitive scraper logic.
*   **Monitoring & Alerting**: Implement logging (e.g., structured logs to a service like Datadog, CloudWatch Logs, or Sentry) and alerts for scraper failures, performance degradation, and account blocks.
*   **Maintenance**: Expect frequent updates to the scraper due to platform changes. Automate deployments to the VPS.
*   **Legal Compliance**: Be aware of and consider the legal implications and Terms of Service of Instagram and TikTok regarding scraping.

---

# Roadmap: Social Scraper

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Social Scraper with Custom (self-built Playwright on VPS)

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create VPS instance (e.g., AWS EC2, DigitalOcean Droplet)
- [ ] Install Docker on VPS
- [ ] Configure VPS firewall rules to allow necessary inbound/outbound traffic
- [ ] Create R2 bucket for screenshot storage
- [ ] Generate R2 API keys and access secret

### 2. Dependencies & Environment
- [ ] **Next.js Project**:
    - [ ] Install: `convex`, `@clerk/nextjs`, `zod` (for validation), `playwright-core` (if any local testing/typing needed, though scraper runs remotely), `aws-sdk` (or similar for R2 interaction from Next.js if direct uploads/downloads are needed)
    - [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CONVEX_URL`, `SOCIAL_SCRAPER_VPS_BASE_URL`, `SOCIAL_SCRAPER_VPS_API_KEY`
- [ ] **VPS Scraper Project (within Docker container)**:
    - [ ] Install: `playwright`, `docker`, `aws-sdk` (for R2), `dotenv`
    - [ ] Env vars: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `SOCIAL_SCRAPER_API_KEY` (shared secret with Next.js)

### 3. Database Schema (Convex)
- [ ] `profiles` table:
    - `clerkUserId`: `string` (Clerk user associated, if any)
    - `platform`: `'instagram' | 'tiktok'`
    - `username`: `string` (unique per platform)
    - `displayName`: `string`
    - `profilePictureUrl`: `string`
    - `bio`: `string`
    - `followerCount`: `number`
    - `lastScrapedAt`: `number` (timestamp)
    - `scrapeStatus`: `'pending' | 'scraping' | 'completed' | 'failed'`
    - `failCount`: `number` (consecutive failures)
    - `errorMessage`: `string | null`
    - `posts`: `array` of `id('posts')`
- [ ] `posts` table:
    - `profileId`: `id('profiles')`
    - `platformPostId`: `string` (unique ID from IG/TikTok)
    - `postUrl`: `string`
    - `caption`: `string`
    - `hashtags`: `array` of `string`
    - `postDate`: `number` (timestamp)
    - `thumbnailUrl`: `string` (R2 URL)
    - `metrics`: `{ views?: number, likes?: number, comments?: number, shares?: number }`
    - `videoPlaybackUrl`: `string | null` (for TikTok)

### 4. Backend Functions (Convex & Next.js API Routes)

#### 4.1. VPS Scraper Service (Python/Node.js application on VPS)
- [ ] **API Endpoint**: `POST /scrape`
    - Purpose: Receives scrape requests from Next.js backend.
    - Input: `{ platform: 'instagram' | 'tiktok', username: string, userId: string, callbackUrl?: string, apiKey: string }`
    - Logic:
        - Authenticates `apiKey`.
        - Enqueues scrape request (e.g., in an in-memory queue or simple file-based queue for MVP).
        - Manages concurrent Playwright browser instances (max 5).
        - Implements user agent rotation, random delays (2-5s).
        - Tracks last crawl time for a profile (5 min minimum interval).
        - Executes Playwright script:
            - Extracts profile data.
            - Extracts up to 30 posts data.
            - Compresses screenshots (<100KB) and uploads to R2.
            - Includes TikTok video playback URL.
        - Handles errors (fewer posts, network timeouts with 3 retries, invalid URLs, deleted posts, partial metrics) without crashing.
        - Logs detailed errors.
        - After completion (success/failure), sends results/status to `callbackUrl` (Next.js API Route/Convex mutation).
- [ ] **Internal Logic**:
    - [ ] Scraper engine: Playwright script for Instagram profile/posts.
    - [ ] Scraper engine: Playwright script for TikTok profile/posts.
    - [ ] R2 uploader: Function to compress and upload images/thumbnails.
    - [ ] Error logging system.
    - [ ] Concurrency and rate limiting management.
    - [ ] Failure tracking: Stops after 5 consecutive failures for a profile.

#### 4.2. Convex Mutations & Queries
- [ ] `profiles.createOrUpdateProfile`:
    - Purpose: Initiates a new profile scrape or updates an existing one.
    - Input: `platform`, `username`, `clerkUserId`
    - Logic: Checks `lastScrapedAt`, `scrapeStatus`, and `failCount` before allowing a new scrape request to the VPS. If conditions met, calls `profiles.requestScrape`.
- [ ] `profiles.requestScrape` (Convex Action or Background Function):
    - Purpose: Calls the external VPS scraper API.
    - Input: `profileId: id('profiles'), platform: 'instagram' | 'tiktok', username: string`
    - Logic: Makes an authenticated `fetch` call to `SOCIAL_SCRAPER_VPS_BASE_URL/scrape` with `SOCIAL_SCRAPER_VPS_API_KEY`. Sets `scrapeStatus` to `'scraping'`.
- [ ] `profiles.handleScrapeResult` (Convex Mutation, called by Next.js API Route webhook):
    - Purpose: Receives results from VPS scraper and updates DB.
    - Input: `profileId: id('profiles'), status: 'completed' | 'failed', data?: ProfileData, error?: string`
    - Logic:
        - Updates `profile` document with new data (`displayName`, `profilePictureUrl`, `bio`, `followerCount`, `lastScrapedAt`, `scrapeStatus`, `failCount`, `errorMessage`).
        - If `status` is `'completed'`, clears `failCount`.
        - If `status` is `'failed'`, increments `failCount`.
        - If `data` contains posts, creates/updates `posts` documents and links them to `profileId`.
- [ ] `profiles.getProfileByUsername`: Query for displaying profile data.
- [ ] `profiles.getRecentPosts`: Query for displaying recent posts.

#### 4.3. Next.js API Routes (acting as webhooks from VPS)
- [ ] `POST /api/webhooks/scrape-result`
    - Purpose: Endpoint for the VPS scraper to send back scrape results.
    - Input: `{ profileId: string, status: 'completed' | 'failed', data?: ProfileData, error?: string, apiKey: string }`
    - Logic:
        - Validates `apiKey` from VPS.
        - Calls `profiles.handleScrapeResult` Convex mutation.
        - Returns HTTP 200.

### 5. Frontend
- [ ] **Profile Search Component**:
    - Purpose: Allows users to search/input Instagram/TikTok usernames.
    - UI: Input field, search button.
    - Interaction: On submit, calls `profiles.createOrUpdateProfile` Convex mutation.
- [ ] **Profile Display Component**:
    - Purpose: Shows scraped profile information and posts.
    - UI: Displays username, display name, picture, bio, follower count. Iterates and displays posts with URL, caption, hashtags, date, thumbnail, metrics.
    - Interaction: Fetches data using `profiles.getProfileByUsername` and `profiles.getRecentPosts` Convex queries. Displays `scrapeStatus` and `lastScrapedAt`.
- [ ] **Scrape Trigger/Refresh Button**:
    - Purpose: Manually re-trigger a scrape for a profile.
    - UI: Button on profile page.
    - Interaction: Calls `profiles.createOrUpdateProfile` mutation, which will re-evaluate if a scrape is allowed based on `lastScrapedAt` and `failCount`.
- [ ] **Loading/Error States**: Visually represent `scrapeStatus` (e.g., "Scraping...", "Failed: [error message]").

### 6. Error Prevention
- [ ] **API errors**: Graceful error handling in Next.js API routes and Convex mutations for external API calls. Log full responses for debugging.
- [ ] **Validation**: `zod` for input validation on Next.js API routes and Convex mutations. Validate data received from VPS.
- [ ] **Rate limiting**:
    - **Scraper**: Implement delays, concurrent limits, and time between crawls per profile on the VPS itself.
    - **Convex/Next.js**: Convex mutations should check `lastScrapedAt` to enforce client-side "rate limiting" for requesting new scrapes of the same profile.
- [ ] **Auth**: Clerk for user authentication. API key authentication for server-to-server (Next.js <-> VPS).
- [ ] **Type safety**: TypeScript throughout Next.js and Convex functions.
- [ ] **Boundaries**: Clearly define data contracts between Next.js, Convex, and VPS scraper.

### 7. Testing
- [ ] **VPS Scraper**:
    - [ ] Unit tests for Playwright scripts (e.g., specific selectors, data extraction logic).
    - [ ] Integration tests: Run scraper against dummy profiles/pages, verify output.
    - [ ] Stress tests: Test concurrent scrapes, failure scenarios (network, deleted posts).
    - [ ] R2 upload tests: Verify compression and storage.
- [ ] **Next.js API Routes**:
    - [ ] Unit tests for input validation and authentication.
    - [ ] Integration tests: Simulate VPS webhook calls, verify Convex mutations are triggered correctly.
- [ ] **Convex Functions**:
    - [ ] Unit tests for mutations and queries logic (e.g., `createOrUpdateProfile`, `handleScrapeResult`).
    - [ ] Integration tests: Verify interaction with the VPS via `requestScrape` (mock external call).
- [ ] **Frontend**:
    - [ ] Component tests for rendering profile data, posts, loading/error states.
    - [ ] End-to-end tests (e.g., Playwright) for user flow: search, trigger scrape, view results.

## Documentation Sources

This implementation plan was created using the following documentation sources:

1. researchgate.net: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFxlJOnakKMu6UrZM1w5ZEr1ZmEwoRukjC8ZbOysEjMj5I_HTwk6A3o_sO6EGF3Xw3oHl15TDIUn26vw7_e5rlvM-r4rpPqSJpkPGQULY4yssOWhCc2zhYHEgbTYxodNDTa6fTBdZdWbt29zvzk5ZSU6L4GXTGXtwb3Q1kmlmzBkIf0o2OHPOe6eH8r_dLumBGzBcBpGrisFOhqoXKfp_GCPhZ5GUNTB5NgPd3T8rECB6BCiNwlxECb
2. susocial.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQHIMYIOXMLEaZBX59w5QrfkyiOj4_2uZb52Zo0k637qfrKWvLfxtYpwKBQfKbypLJVoCeTZOccVsTsNNYiKfU_TBywz7UPM2OG7s9xcdYBtp8ryfXG0dhRdK12spPnX2U0YqDL65U0b68TDvEoKdywq2yU6iXZOFAIg0M0nRztinAjzsw4o5BBkXRyk9z9EKgu0FEq-
3. scrapecreators.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGou8yMN3AnphikswNEzLOhbXIOVpve2D-CEen9lOdndfh1xY5sofikeoeJmhhabmW7fRWYSbb4i2GfWIEFXN47NF3tBcfDQK8AQ6XmsUJdZ-AzrOfbUJUJ8iD5HQfv2aZUPxjpSyMSOCqrLf5EWQZsFF3We_s1f0VbxV2hn4AsrFbSCsBCGOfoD3LSDVoQGmGCE0dri1hplTLY0zdQuXKODe0Jvqtv5dfaIw==
4. icwsm.org: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGMX7vApVoVX-nhbOhHVxjv0D2hmFp92SQEDRWeps4Y-rG0VKyObpSJMrPqphzQEmgZv0EdOodMZkuqIluwKciLEtV6DIRob4WSEiJUeqZQEgIAg_uR-mUnkZTHjyxug6EA2Fo4wUt1JIsCeMWQdGN7yQ==
5. aimultiple.com: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQH0UFwsV8t7i1KoPDIkQkeY_z720EfVVelKV-suzACRbML0zJSjZUo6GAX2wAcHmGgkbT0dO_aD3o10d7P6CtSJ43sdDisCTGNcQTycI-qwoX56DHFfQ-eaEOsZ1n2lCCpN2NSm7cz1zhfBvMoDRE8MLg==
