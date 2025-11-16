# Roadmap: Campaign Analytics

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Campaign Analytics with Custom
- Goal: Provide clients with a live analytics dashboard displaying campaign performance metrics (views, likes, comments, shares, engagement rate, live posts, average CPM) with interactive charts, date range filtering, and platform filtering, updated real-time from scraped data stored in Convex.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex project
- [ ] Connect Convex to GitHub repository
- [ ] Create Clerk account
- [ ] Configure Clerk application
- [ ] Set Clerk Frontend API URL as `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex [cite:2_3]
- [ ] Create a Clerk JWT template named `convex` (default template) [cite:2_3]

### 2. Dependencies & Environment
- [ ] Install: `@convex-dev/react`, `@convex-dev/aggregate`, `@clerk/nextjs`, `recharts`, `date-fns`, `@radix-ui/react-popover`, `@radix-ui/react-select`, `@radix-ui/react-checkbox`, `tailwindcss`, `shadcn/ui`
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `CLERK_JWT_ISSUER_DOMAIN`

### 3. Database Schema
- [ ] `performance_metrics` table:
    - `_id: Id<'performance_metrics'>`
    - `timestamp: number` (Unix milliseconds, indexed for time-series queries)
    - `campaignId: Id<'campaigns'>` (indexed)
    - `platform: "TikTok" | "Instagram"` (indexed)
    - `postId: string` (unique identifier for each post)
    - `views: number`
    - `likes: number`
    - `comments: number`
    - `shares: number`
    - `engagementRate: number`
    - `cpm: number`
    - `isLivePost: boolean`
- [ ] `campaigns` table:
    - `_id: Id<'campaigns'>`
    - `clientId: Id<'clients'>` (indexed for client-specific access)
    - `name: string`
    - `budget: number`
- [ ] `users` table (synced from Clerk):
    - `_id: Id<'users'>`
    - `clerkUserId: string` (indexed, unique Clerk user ID)
    - `email: string`
    - `role: "admin" | "client" | "influencer"` (indexed for authorization)
    - `clientId: Id<'clients'> | null` (if user is a client)
- [ ] Indexes for `performance_metrics`: `by_timestamp`, `by_campaignId_timestamp`, `by_campaignId_platform_timestamp`
- [ ] Define `@convex-dev/aggregate` for pre-calculating frequently accessed sums/counts (e.g., `totalViewsByCampaignAndDay`) if raw queries are too slow for aggregations.

### 4. Backend Functions
- [ ] **Convex Mutations (for scraper input):**
    - `addPerformanceMetric(data: PerformanceMetric)`: Inserts new metric data.
    - `updatePerformanceMetric(id: Id<'performance_metrics'>, data: Partial<PerformanceMetric>)`: Updates existing metric data.
    - `syncClerkUser(clerkUserId: string, email: string, role: string, clientId?: Id<'clients'>)`: Creates or updates user in Convex from Clerk webhook/trigger [cite:4_3].
- [ ] **Convex Queries (for analytics dashboard):**
    - `getCampaignPerformanceMetrics(campaignId: Id<'campaigns'>, startDate: number, endDate: number, platform?: "TikTok" | "Instagram")`: Fetches raw performance metrics within a date range and optionally by platform.
    - `getAggregatedMetrics(campaignId: Id<'campaigns'>, startDate: number, endDate: number, platform?: "TikTok" | "Instagram")`: Calculates and returns aggregated metrics (total views, likes, comments, shares, average engagement rate, average CPM, total live posts).
    - `getMetricsOverTime(campaignId: Id<'campaigns'>, startDate: number, endDate: number, platform?: "TikTok" | "Instagram", interval: "day" | "week" | "month")`: Fetches time-series data for the line chart, aggregated by interval.
    - `getClientCampaigns(clientId: Id<'clients'>)`: Fetches campaigns associated with the authenticated client.
- [ ] **Convex Actions (for more complex aggregation or external calls, if needed):**
    - `runDailyAggregations()`: Scheduled action to pre-calculate daily/weekly aggregates and store them in a separate `daily_campaign_summary` table to optimize dashboard queries.
- [ ] **Auth Enforcement in Convex:**
    - All queries and mutations interacting with sensitive campaign data must use `ctx.auth.getUserIdentity()` to verify the authenticated user and their `role` and `clientId` to ensure they only access authorized campaigns [cite:5_3].

### 5. Frontend
- [ ] **Providers:**
    - `ConvexClientProvider` wrapped with `ConvexProviderWithClerk` in a Client Component in `app/layout.tsx` [cite:2_3].
- [ ] **Pages:**
    - `app/client/[clientId]/dashboard/page.tsx`: Client Dashboard page, likely a Client Component to leverage `useQuery` and interactive state.
- [ ] **Components:**
    - `DashboardLayout`: Overall layout for the client dashboard.
    - `MetricCards`: Displays individual metric cards (Total Views, Likes, etc.).
    - `CampaignPerformanceChart`: Interactive line chart using `Recharts` for metrics over time with dual axes, tooltips, and responsive design [cite:1_2, 2_2, 5_2].
    - `DateRangePicker`: Uses `shadcn/ui` calendar and `date-fns` for date selection with presets (Last 7/14/30 Days, Quarter, Year) and custom range [cite:3_2].
    - `PlatformFilter`: Dropdown/checkboxes for selecting TikTok/Instagram.
    - `MetricToggleCheckboxes`: Checkboxes to dynamically select which metrics to display on the chart.
    - `LoadingSpinner`, `ErrorBoundary`: For UX during data fetching and error states.
- [ ] **State:**
    - Use `useState` and `useReducer` hooks for managing local UI state (selected date range, active filters, selected metrics for chart).
    - Use Convex `useQuery` hook for real-time data fetching from backend functions, ensuring reactivity.

### 6. Error Prevention
- [ ] **API errors:** Implement robust error handling in Convex mutations/queries and gracefully display messages in the UI.
- [ ] **Validation:** Enforce schema validation in Convex and input validation in frontend forms.
- [ ] **Rate limiting:** Be aware of Convex rate limits; optimize queries to fetch only necessary data. Implement client-side debounce for rapid filter changes.
- [ ] **Auth:** Strict authorization checks in all Convex functions based on Clerk user roles and `clientId` [cite:5_3].
- [ ] **Type safety:** Leverage TypeScript end-to-end (Next.js, Convex schema, Convex functions) for type safety.
- [ ] **Boundaries:** Use React Error Boundaries for isolating UI component failures.
- [ ] **Empty states:** Handle cases where no data is available for a given filter/campaign.

### 7. Testing
- [ ] **Unit Tests:**
    - Convex mutations: `addPerformanceMetric`, `updatePerformanceMetric`.
    - Convex queries: `getAggregatedMetrics`, `getMetricsOverTime` (e.g., correct aggregation, filtering, authorization).
- [ ] **Integration Tests:**
    - Frontend dashboard components with mocked Convex data.
    - Clerk authentication flow and its interaction with Convex user syncing.
- [ ] **End-to-End Tests (e.g., Playwright/Cypress):**
    - Client signs in, navigates to dashboard, views campaign data.
    - Filters correctly update displayed metrics and charts.
    - Real-time updates push new data to the dashboard.
    - Unauthorized users cannot access client-specific dashboards.



## Documentation Sources

This implementation plan was created using the following documentation sources:

1. convex.dev: https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQFiaVjQYxyYsoDVq5IH4goOxHhVU882ITDNvZgWXe-IHDvyZcqJHwYB0ZzIGyiwAF6ndfN0xfsCMft-pdnx-n3kJz9ojg0Qtr0VfKCYGOahGHNyTkYohS117zMqub3ohakJymRNCdY=
