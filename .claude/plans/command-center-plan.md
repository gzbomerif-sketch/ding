# Roadmap: Command Center

## Context
- **App Goal**: SylcRoad's Command Center will serve as Social Sculp's operational hub for managing creator marketing strategies and campaigns, providing quick insights, activity oversight, and critical alerts. It enables aggregated views for internal teams, with a focus on real-time data from internal systems (Convex) and scraped performance metrics.
- **Stack**: Next.js (App Router), Convex, Clerk
- **Feature**: Admin Dashboard Overview with quick stats, recent activity, alerts, and customizable homebase. "Custom" in this context refers to a custom-built solution on the specified stack, not an external API product.

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Convex account and project.
- [ ] Create Clerk account and application.
- [ ] Configure Clerk application settings (e.g., allowed redirect URLs, webhooks for user data sync if needed).

### 2. Dependencies & Environment
- [ ] Install: `next`, `react`, `react-dom`, `@clerk/nextjs`, `convex`, `react-query` (or `swr` for data fetching), `zod` (for validation), `tailwindcss`, `postcss`, `autoprefixer`, `@radix-ui/react-slot` (or similar for UI primitives), `react-resizable-panels` (for basic layout), `recharts` (for charting).
- [ ] Env vars:
    - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
    - `CLERK_SECRET_KEY`
    - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
    - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
    - `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard`
    - `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`
    - `NEXT_PUBLIC_CONVEX_URL`
    - `CONVEX_DEPLOY_KEY`

### 3. Database Schema (Convex)
- [ ] `users`: `{ clerkId: string (index), email: string, role: "admin" | "team" | "brand" | "influencer", firstName: string, lastName: string, createdAt: number, updatedAt: number, dashboardConfig: { widgets: string[], layout: any } }`
- [ ] `payments`: `{ influencerId: Id<'influencers'>, amount: number, status: "pending" | "paid" | "overdue", dueDate: number, campaignId: Id<'campaigns'>, createdAt: number, updatedAt: number }`
- [ ] `campaigns`: `{ brandId: Id<'brands'>, name: string, status: "active" | "draft" | "completed" | "paused", budget: number, startDate: number, endDate: number, influencers: Id<'influencers'>[], createdAt: number, updatedAt: number }`
- [ ] `influencers`: `{ userId: Id<'users'>, name: string, status: "pending_signature" | "active" | "inactive", contactInfo: any, platformHandles: { instagram: string, tiktok: string }, createdAt: number, updatedAt: number }`
- [ ] `videos`: `{ influencerId: Id<'influencers'>, campaignId: Id<'campaigns'>, platform: "instagram" | "tiktok", url: string, status: "draft" | "pending_review" | "approved" | "rejected" | "live", uploadDate: number, reviewDate?: number, createdAt: number, updatedAt: number }`
- [ ] `activity_log`: `{ type: "upload" | "approval" | "payment" | "signup" | "milestone" | "metric_update", entityId: Id<any>, details: any, timestamp: number, userId?: Id<'users'>, relatedCampaignId?: Id<'campaigns'> }`
- [ ] `performance_metrics`: `{ entityId: Id<any>, entityType: "campaign" | "influencer" | "platform", metricName: string, value: number, timestamp: number, source: string }`
- [ ] `alerts`: `{ type: "payment_deadline" | "video_review" | "contract_expiration" | "performance_threshold" | "scraper_error", message: string, severity: "low" | "medium" | "high", targetId: Id<any>, resolved: boolean, createdAt: number, dueDate?: number }`

### 4. Backend Functions (Convex)
- [ ] `auth.getAdminUser`: Query function to retrieve the authenticated user's admin role and details.
- [ ] `queries.dashboard.getQuickStats`: Query function to aggregate data for `open payments`, `videos coming up`, `active campaigns`, `influencers pending signature`, `total platform metrics`, `revenue tracking`.
- [ ] `queries.dashboard.getRecentActivity`: Query function to fetch a paginated list of `activity_log` entries, ordered by timestamp, with real-time updates.
- [ ] `queries.dashboard.getAlerts`: Query function to fetch active `alerts` for the admin, with real-time updates.
- [ ] `queries.dashboard.getPerformanceMetrics`: Query function to fetch specific `performance_metrics` for selected widgets.
- [ ] `mutations.dashboard.saveDashboardConfig`: Mutation function to update a user's `dashboardConfig` (widget selection, layout).
- [ ] `mutations.payments.markAsPaid`: Mutation function for payment status updates.
- [ ] `mutations.videos.updateVideoStatus`: Mutation function for video review/approval.
- [ ] `mutations.influencers.updateInfluencerStatus`: Mutation function for signature updates.
- [ ] `actions.scraper.runMetricsUpdate`: Action to trigger external scraper (if any) or process new scraped data.
- [ ] `actions.alerts.generateAlerts`: Action to programmatically create alerts based on business logic (e.g., payment due date approaching).

### 5. Frontend (Next.js)
- [ ] **Auth Layer**:
    - [ ] `app/layout.tsx`: Wrap application with `ClerkProvider`.
    - [ ] `middleware.ts`: Protect `/dashboard` route and sub-routes, allowing access only to authenticated users with `admin` or `team` roles (implement role check using Clerk's `sessionClaims` or `currentUser` helper).
    - [ ] `app/(auth)/sign-in/[[...sign-in]]/page.tsx`: Clerk's `SignIn` component.
    - [ ] `app/(auth)/sign-up/[[...sign-up]]/page.tsx`: Clerk's `SignUp` component.
- [ ] **Dashboard Layout**:
    - [ ] `app/dashboard/layout.tsx`: Main dashboard layout including persistent sidebar (navigation), header (user menu, quick actions), and main content area.
    - [ ] `components/Sidebar.tsx`: Navigation links to different dashboard sections.
    - [ ] `components/Header.tsx`: User profile, notifications, quick search.
- [ ] **Homebase Components**:
    - [ ] `app/dashboard/page.tsx`: Main Command Center view.
    - [ ] `components/dashboard/QuickStatsCards.tsx`: Displays aggregated data from `queries.dashboard.getQuickStats`.
    - [ ] `components/dashboard/RecentActivityFeed.tsx`: Displays `activity_log` using Convex's real-time queries.
    - [ ] `components/dashboard/AlertsDisplay.tsx`: Shows active alerts from `queries.dashboard.getAlerts`.
    - [ ] `components/dashboard/WidgetContainer.tsx`: Generic container for different widgets, handles resizing and drag-and-drop (if implemented).
    - [ ] `components/dashboard/WidgetPicker.tsx`: UI for selecting available widgets.
    - [ ] `components/dashboard/CustomizableLayout.tsx`: Renders widgets based on `dashboardConfig` from `users` table, allows rearrangement and saving configuration.
    - [ ] `components/dashboard/charts/RevenueChart.tsx`: Example chart using `recharts` for revenue tracking.
    - [ ] `components/dashboard/charts/PerformanceChart.tsx`: Example chart for overall performance metrics.
- [ ] **Data Fetching**:
    - [ ] Utilize Convex's `useQuery` hooks for real-time data fetching in client components.
    - [ ] For server components, use Convex's generated server functions. Ensure `export const dynamic = "force-dynamic";` where real-time updates are critical for RSCs.

### 6. Error Prevention
- [ ] **API errors**: Robust error handling in Convex mutations/queries (try/catch, return error objects). Frontend displays user-friendly error messages.
- [ ] **Validation**: Schema validation using `Zod` for all Convex mutations and API routes. Frontend form validation.
- [ ] **Rate limiting**: Implement Convex access rules and consider API gateway for external-facing "scraper" actions if direct external calls become too frequent.
- [ ] **Auth**: Server-side checks for user roles and permissions on all sensitive Convex queries and mutations using Clerk's `auth` context.
- [ ] **Type safety**: Leverage TypeScript across the entire stack (Next.js, Convex, Clerk) for compile-time error checking.
- [ ] **Boundaries**: Implement React error boundaries for UI components to prevent entire dashboard crashes.

### 7. Testing
- [ ] **Unit Tests**: Test individual Convex functions (queries, mutations) and frontend React components.
- [ ] **Integration Tests**: Test data flow from UI actions through Convex functions and back to UI updates.
- [ ] **End-to-End Tests**: Simulate user login, navigation to dashboard, widget interactions, and data updates.
- [ ] **Authentication Tests**: Verify role-based access control, ensuring only authorized users can access admin features.
- [ ] **Real-time Tests**: Verify that changes in Convex data are immediately reflected in dashboard components.
- [ ] **Performance Tests**: Evaluate dashboard loading times and responsiveness, especially with multiple widgets and real-time updates.