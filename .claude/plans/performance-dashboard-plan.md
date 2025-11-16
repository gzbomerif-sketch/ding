The "Custom API" referred to in the prompt is interpreted as a **Third-Party Social Media Analytics API** (e.g., Socialinsider, Late, Keyhole) that aggregates data from Instagram and TikTok, enabling a "custom-built" performance dashboard. This approach offers the simplest and most straightforward implementation for an MVP, avoiding the complexities of direct integration with individual platform APIs for Instagram and TikTok. The "API/NO API OPTIONS" for CPM refers to leveraging the external API for view counts (API option) versus relying on internally stored/estimated view data (No API option), with the API option being the primary focus for live analytics.

# Roadmap: Performance Dashboard

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Performance Dashboard with Custom (Third-Party Social Media Analytics API)

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Research and select a Third-Party Social Media Analytics API (e.g., Socialinsider, Late, Keyhole) that supports Instagram and TikTok data.
- [ ] Create an account with the chosen Custom Analytics provider.
- [ ] Configure the Custom Analytics dashboard/project (if applicable).
- [ ] Generate API keys or obtain necessary credentials.
- [ ] Review documentation for OAuth/account connection process to link client Instagram and TikTok accounts.
- [ ] Understand API pricing, rate limits, and data retention policies.
- [ ] Configure webhooks for real-time data updates (if supported and necessary for immediate data freshness).
- [ ] Configure billing for the chosen API service.

### 2. Dependencies & Environment
- [ ] Install: `node-fetch` (or a similar HTTP client for Convex backend), `@tanstack/react-query` (or SWR for data fetching in Next.js).
- [ ] Env vars: `CUSTOM_ANALYTICS_API_KEY`, `CUSTOM_ANALYTICS_API_BASE_URL`

### 3. Database Schema (Convex)
- [ ] `campaigns`:
    - `_id`: `Id<'campaigns'>`
    - `brandId`: `Id<'brands'>`
    - `name`: `string`
    - `description`: `string`
    - `budget`: `number`
    - `startDate`: `number` (timestamp)
    - `endDate`: `number` (timestamp)
    - `connectedSocialAccounts`: `Array<{ platform: 'instagram' | 'tiktok', accountId: string, accessToken: string }>` (store tokens securely, likely encrypted or short-lived, handled by Custom Analytics API's OAuth flow)
    - `status`: `'active' | 'completed' | 'paused'`
- [ ] `influencers`: (Existing schema, but ensure payment/earning fields)
    - `_id`: `Id<'influencers'>`
    - ...
    - `payments`: `Array<{ campaignId: Id<'campaigns'>, amount: number, status: 'paid' | 'pending' }>`
- [ ] `campaignAnalytics`: (Store aggregated or raw data from Custom Analytics API to avoid excessive API calls)
    - `_id`: `Id<'campaignAnalytics'>`
    - `campaignId`: `Id<'campaigns'>`
    - `platform`: `'instagram' | 'tiktok'`
    - `date`: `number` (timestamp, start of day/week/month)
    - `totalImpressions`: `number`
    - `totalReach`: `number`
    - `totalViews`: `number` (for video content)
    - `totalEngagement`: `number` (likes, comments, shares, etc.)
    - `engagementRate`: `number`
    - `postCount`: `number`
    - `cpm`: `number` (calculated, see backend)
    - `lastUpdatedAt`: `number` (timestamp)
- [ ] `postAnalytics`: (Optional, for drill-down into individual post performance)
    - `_id`: `Id<'postAnalytics'>`
    - `campaignId`: `Id<'campaigns'>`
    - `platform`: `'instagram' | 'tiktok'`
    - `postId`: `string` (from social media platform)
    - `postUrl`: `string`
    - `contentType`: `string` (`image`, `video`, `carousel`)
    - `publishedAt`: `number` (timestamp)
    - `impressions`: `number`
    - `reach`: `number`
    - `views`: `number`
    - `likes`: `number`
    - `comments`: `number`
    - `shares`: `number`
    - `lastUpdatedAt`: `number`

### 4. Backend Functions (Convex)
- [ ] `api/customAnalytics/connectAccount`:
    - Purpose: Initiate OAuth flow for a brand to connect their Instagram/TikTok accounts via the Custom Analytics API. Stores necessary tokens/credentials.
- [ ] `api/customAnalytics/fetchAndStoreCampaignData`:
    - Purpose: Fetches historical and recent campaign-level data (impressions, reach, views, engagement) from the Custom Analytics API for connected social accounts.
    - Logic: Iterates through `campaigns`, pulls data for `connectedSocialAccounts`, and stores/updates `campaignAnalytics` and optionally `postAnalytics`. Implements caching logic to prevent redundant API calls.
    - Scheduling: Set up a Convex CRON job to run this periodically (e.g., daily) for data freshness.
- [ ] `api/customAnalytics/calculateCPM`:
    - Purpose: Calculates CPM for a given campaign and period.
    - Logic:
        - **API Option:** Retrieves `totalViews` from `campaignAnalytics` (fetched from Custom Analytics API) for the specified date range. Retrieves `totalPayment` for the campaign from `influencers` or `campaigns` table. Calculates `CPM = (Total Payment / Total Views) * 1000`.
        - **No API Option:** If `totalViews` is not available from the Custom Analytics API (e.g., missing data, or for manually managed campaigns), retrieves `totalViews` from an internally tracked field (if available in `campaignAnalytics` or `campaigns`) or allows for a fallback mechanism (e.g., default value, explicit manual input). Combines with `totalPayment` to calculate CPM.
    - Updates `cpm` field in `campaignAnalytics`.
- [ ] `api/dashboard/getOverviewData`:
    - Purpose: Aggregates high-level campaign metadata for the client homepage.
    - Logic: Fetches `campaigns`, calculates total number of campaigns, total budget, etc.
- [ ] `api/dashboard/getPerformanceMetrics`:
    - Purpose: Retrieves aggregated performance metrics for the dashboard's main display, based on filters.
    - Logic: Queries `campaignAnalytics` and `postAnalytics` (if used) based on `campaignId`, `dateRange`, and `platform` filters. Aggregates data as needed.
- [ ] `api/dashboard/getCampaignDetails`:
    - Purpose: Retrieves detailed data for a specific campaign, potentially including a list of individual posts and their metrics.
    - Logic: Queries `campaignAnalytics` and `postAnalytics` for a given `campaignId`.

### 5. Frontend (Next.js)
- [ ] **Components**:
    - `Header`: Displays client logo, profile logo, account settings.
    - `CampaignOverviewCard`: Shows campaign title, number of campaigns, creation date, total budget (fetched from `api/dashboard/getOverviewData`).
    - `FilterControls`:
        - `DateRangeSelector`: Dropdown for "Last 7 Days", "Last 14 Days", etc., and custom date picker. Manages `startDate`, `endDate` state.
        - `PlatformFilter`: Dropdown for "All Platforms", "TikTok", "Instagram". Manages `platform` state.
        - `CPMDisplay`: Component to display calculated CPM.
    - `LivePostAnalyticsDashboard`: Main display area for charts and aggregated metrics.
    - `PerformanceChart`: Reusable component for displaying time-series data (e.g., impressions over time).
    - `MetricsSummaryCard`: Displays key metrics like total impressions, reach, views, engagement, and calculated CPM for the selected period and platform.
- [ ] **State**:
    - Global state (e.g., React Context or Zustand) or component-local state for filter values: `selectedDateRange`, `customStartDate`, `customEndDate`, `selectedPlatform`.
    - Data loading states: `isLoading`, `isError`.
    - Data fetched from Convex queries (using `@tanstack/react-query` or SWR for efficient data management and caching).
- [ ] **Pages**:
    - `pages/dashboard/index.tsx`: Client Overview/Homepage, orchestrating all components.
    - `pages/api/clerkWebhook.ts`: (If using webhooks for account connection/disconnection events from Custom Analytics API).

### 6. Error Prevention
- [ ] **API errors**: Implement `try-catch` blocks in Convex backend functions for Custom Analytics API calls. Handle network errors, authentication failures, and API-specific error codes. Display user-friendly messages on the frontend.
- [ ] **Validation**: Validate input (date ranges, platform selection) on both frontend and backend.
- [ ] **Rate limiting**: Implement robust caching in Convex (`campaignAnalytics` table) to minimize calls to the Custom Analytics API. Potentially add exponential backoff for retries on rate limit errors.
- [ ] **Auth**: Ensure all Convex queries and mutations are protected by Clerk authentication. Only authenticated SylcRoad users (clients) can access their respective campaign data.
- [ ] **Type safety**: Use TypeScript throughout Next.js and Convex for robust data handling and to catch errors early. Define clear types for API responses and database schemas.
- [ ] **Boundaries**: Set clear boundaries for date ranges (e.g., maximum historical data available from Custom Analytics API) and filter options to avoid invalid requests.

### 7. Testing
- [ ] **Unit Tests (Convex)**:
    - Test `api/customAnalytics/fetchAndStoreCampaignData` for correctly fetching, transforming, and storing data.
    - Test `api/customAnalytics/calculateCPM` for accurate CPM calculation with both API-derived views and internal view options.
    - Test `api/dashboard/getPerformanceMetrics` for correct filtering and aggregation.
- [ ] **Integration Tests (Convex & Custom Analytics API)**:
    - Test end-to-end data flow: account connection -> data fetch -> data storage -> data retrieval. (Using mock API responses for Custom Analytics API during actual testing)
- [ ] **E2E Tests (Next.js with Playwright/Cypress)**:
    - Verify filter controls function correctly (date range, platform).
    - Ensure dashboard data updates dynamically based on filters.
    - Check that CPM is calculated and displayed accurately.
    - Test responsiveness and UI/UX on different screen sizes.
    - Verify secure access with Clerk authentication.
- [ ] **Performance Testing**:
    - Monitor loading times for dashboard data, especially with large datasets or complex filters.
    - Stress test Convex queries and Custom Analytics API calls.