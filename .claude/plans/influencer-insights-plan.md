The "Custom API" in the feature description refers to the *internal* API built within your SylcRoad platform, which will process and serve data gathered by a *local Playwright scraper*. It does not imply integration with an external, third-party "Custom" service. The analytics and reporting will be derived entirely from data collected locally and stored within your Convex database.

Therefore, the research on external API capabilities, documentation, authentication methods, rate limits, and pricing for a hypothetical "Custom API" is not applicable. Instead, the focus shifts to building robust *internal* data pipelines and API endpoints using your specified stack (Next.js, Convex, Clerk) to support the desired Influencer Insights.

# Roadmap: Influencer Insights

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Influencer Insights (derived from local Playwright scraper data)

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Configure Playwright scraping environment (e.g., dedicated server/VM, Docker container)
- [ ] Set up Convex project and connect to Next.js application
- [ ] Configure Clerk for user authentication and authorization within Next.js and Convex

### 2. Dependencies & Environment
- [ ] Install: `convex`, `next`, `react`, `react-dom`, `@clerk/nextjs`, `@convex-dev/react`, `playwright`, `date-fns`, `chart.js`, `react-chartjs-2`, `xlsx` (for Excel export), `jspdf` (for PDF export), `csv-stringify` (for CSV export)
- [ ] Env vars: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CONVEX_DEPLOYMENT_URL`, `PLAYWRIGHT_SCRAPER_API_KEY` (internal API key for scraper to submit data)

### 3. Database Schema (Convex)
- [ ] Structure:
    - `influencers`: `{ clerkUserId: string, socialHandles: { instagram: string | null, tiktok: string | null }, ... }`
    - `campaigns`: `{ brandId: Id<'brands'>, name: string, budget: number, startDate: number, endDate: number, ... }`
    - `campaignInfluencers`: `{ campaignId: Id<'campaigns'>, influencerId: Id<'influencers'>, assignmentDetails: any, paymentAmount: number, ... }`
    - `scrapedContent`: `{ influencerId: Id<'influencers'>, platform: 'instagram' | 'tiktok', postId: string, postUrl: string, views: number, likes: number, comments: number, shares: number, timestamp: number, campaignId: Id<'campaigns'> | null, ... }`
    - `performanceMetrics`: `{ influencerId: Id<'influencers'> | null, campaignId: Id<'campaigns'> | null, metricType: string, value: number, timestamp: number, ... }` (Aggregated/calculated metrics)
    - `paymentHistory`: `{ influencerId: Id<'influencers'>, campaignId: Id<'campaigns'>, amount: number, status: 'pending' | 'paid', paidDate: number, ... }`
    - `crawlHistory`: `{ scraperId: string, timestamp: number, status: 'success' | 'failure', details: any, ... }`

### 4. Backend Functions (Convex)
- [ ] Functions:
    - `scraper:submitScrapedData`: Store raw scraped content into `scrapedContent` table.
    - `analytics:calculateCampaignROI`: Calculate ROI based on `scrapedContent` views and `campaignInfluencers` payments.
    - `analytics:getCampaignTimeSeries`: Aggregate `scrapedContent` data over time for a campaign.
    - `analytics:getInfluencerComparison`: Aggregate and compare `performanceMetrics` for selected influencers.
    - `analytics:getContentBreakdown`: Analyze content types from `scrapedContent` for a campaign/influencer.
    - `analytics:getBudgetTracking`: Track `campaigns` budget against `campaignInfluencers` payments.
    - `analytics:getIndividualPerformance`: Retrieve individual `performanceMetrics` for an influencer.
    - `analytics:getPaymentHistory`: Fetch `paymentHistory` for an influencer.
    - `analytics:getApprovalRates`: Calculate approval rates from `campaignInfluencers` statuses.
    - `analytics:getHistoricalTrends`: Retrieve historical `performanceMetrics` for an influencer.
    - `reporting:exportData`: Generate CSV/Excel/PDF based on query parameters, date ranges, and filtered metrics using `performanceMetrics`, `scrapedContent`, `paymentHistory`.
    - `reporting:scheduleReport`: Schedule `reporting:exportData` for automated delivery.

### 5. Frontend (Next.js)
- [ ] Components:
    - `AdminDashboardPage`: Main entry for admin analytics.
    - `CampaignAnalyticsDashboard`: Displays campaign-level insights.
    - `CreatorAnalyticsDashboard`: Displays individual creator performance.
    - `PerformanceChart`: Reusable component for time-series, comparison, breakdowns.
    - `DataTable`: For displaying tabular data (e.g., payment history, raw metrics).
    - `DateRangePicker`: For custom date filtering.
    - `ExportButton`: Triggers `reporting:exportData` with selected options.
- [ ] State:
    - `useConvexAuth`: For user authentication and role-based access.
    - `useQuery`: For fetching data from Convex backend functions.
    - Local React state for UI interactions (e.g., selected date ranges, filters, chart options).

### 6. Error Prevention
- [ ] API errors: Robust error handling in Convex functions and Next.js data fetching, graceful degradation in UI.
- [ ] Validation: Input validation for all Convex function arguments (e.g., date ranges, IDs, filter parameters).
- [ ] Rate limiting: Implement internal rate limiting for UI requests to Convex if needed to prevent abuse, though less critical than external APIs.
- [ ] Auth: Clerk middleware for API routes and Convex function permissions to ensure only authorized users access sensitive analytics.
- [ ] Type safety: Leverage Convex's type inference and TypeScript throughout frontend and backend.
- [ ] Boundaries: Implement data pagination for large datasets, apply max date range limits, enforce query complexity limits in Convex.

### 7. Testing
- [ ] Test scenarios:
    - Successful data ingestion from Playwright scraper to Convex.
    - Accurate calculation of all derived analytics metrics (ROI, time-series, comparisons).
    - Correct display of data in various charts and tables on dashboards.
    - Proper filtering by date ranges and other criteria.
    - Successful CSV, Excel, and PDF export with correct data and formatting.
    - Role-based access control for admin and client dashboards.
    - Handling of empty states (e.g., no data for selected filters).
    - Performance under various data loads for queries and UI rendering.