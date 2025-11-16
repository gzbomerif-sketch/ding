# Roadmap: Influencer Rankings

## Context
- Stack: Next.js, Convex, Clerk
- Feature: Influencer Rankings using a custom implementation within the Convex backend. The term "Custom" refers to building this feature using the provided tech stack and internal database rather than a specific third-party API named "Custom."

## Implementation Steps

### 1. Manual Setup (User Required)
- [ ] Create Clerk account and configure application.
- [ ] Create Convex account and new project.
- [ ] Connect Clerk to Convex for authentication.

### 2. Dependencies & Environment
- [ ] Install: `convex`, `@convex-dev/aggregate`, `@clerk/nextjs`, `@clerk/clerk-react`, `convex-helpers` (for triggers if used with aggregate component).
- [ ] Env vars: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`, `CONVEX_DEPLOYMENT_URL`, `CLERK_JWT_ISSUER_DOMAIN` (for Convex dashboard settings).

### 3. Database Schema (convex/schema.ts)
- [ ] Define `profiles` table:
    - `username: v.string()`
    - `profilePictureUrl: v.string()`
    - `paymentPerVideo: v.number()`
    - `clerkUserId: v.string()` (for linking to Clerk users)
    - `totalVideos: v.number()` (denormalized, updated by triggers)
    - `totalViews: v.number()` (denormalized, updated by triggers)
    - `cpm: v.number()` (denormalized, calculated & updated by triggers)
- [ ] Define `posts` table:
    - `profileId: v.id("profiles")`
    - `campaignId: v.id("campaigns")`
    - `videoUrl: v.string()`
    - `_creationTime: v.number()` (automatic, used for date range filtering)
- [ ] Define `performance_metrics` table:
    - `postId: v.id("posts")`
    - `totalViews: v.number()`
    - `engagementRate: v.number()`
    - `_creationTime: v.number()` (automatic, used for date range filtering)
- [ ] Define `campaigns` table:
    - `name: v.string()`
    - `startDate: v.number()`
    - `endDate: v.number()`
- [ ] Define indexes for efficient querying:
    - `profiles`: `by_clerk_user_id` (`["clerkUserId"]`)
    - `posts`: `by_profile_and_creation_time` (`["profileId", "_creationTime"]`), `by_campaign_and_creation_time` (`["campaignId", "_creationTime"]`)
    - `performance_metrics`: `by_post_id` (`["postId"]`)
- [ ] If using `@convex-dev/aggregate` component, define its schema (e.g., `_aggregate_profiles_views`, `_aggregate_profiles_posts`).

### 4. Backend Functions (Convex)
- [ ] `profiles.ts`
    - [ ] `getInfluencerRankings` (query):
        - Args: `campaignId: v.optional(v.id("campaigns"))`, `startDate: v.optional(v.number())`, `endDate: v.optional(v.number())`, `sortBy: v.string()`, `sortOrder: v.string()`
        - Logic:
            - Authenticate user via `ctx.auth`.
            - Fetch `profiles` documents.
            - Filter `posts` and `performance_metrics` by `campaignId` and `_creationTime` (date range).
            - Aggregate `totalVideos` (count from `posts`) and `totalViews` (sum from `performance_metrics`) per influencer. *Recommendation: Use `@convex-dev/aggregate` component with triggers or denormalize these fields on `profiles` and update them via mutations/triggers for scalability.*
            - Calculate `cpm` per influencer based on aggregated data and `paymentPerVideo`.
            - Sort the results dynamically based on `sortBy` and `sortOrder`.
            - Highlight top performer (e.g., by adding a `isTopPerformer` boolean or rank in the returned object).
- [ ] `posts.ts`
    - [ ] `createPost` (mutation): Inserts a new post, updates `profiles.totalVideos` (if denormalized) and `@convex-dev/aggregate` (if used).
- [ ] `performanceMetrics.ts`
    - [ ] `addPerformanceMetrics` (mutation): Adds metrics for a post, updates `profiles.totalViews` (if denormalized) and `@convex-dev/aggregate` (if used).
- [ ] `triggers.ts` (if using `convex-helpers` for `onUpdate` / `onInsert` triggers):
    - [ ] Define triggers for `posts` and `performance_metrics` tables to automatically update denormalized fields on `profiles` or the `@convex-dev/aggregate` component whenever related data changes.

### 5. Frontend (Next.js)
- [ ] `app/layout.tsx`: Wrap with `ClerkProvider` and `ConvexClientProvider`.
- [ ] `components/InfluencerRankingsTable.tsx`:
    - [ ] A Client Component to display the table of influencers.
    - [ ] Takes `influencers` data as props.
    - [ ] Renders `profilePictureUrl`, `username`, `paymentPerVideo`, `totalVideos`, `totalViews`, `cpm`.
    - [ ] Implements animated transitions for sorting (e.g., using a library like Framer Motion or CSS transitions).
    - [ ] Highlights the top performer.
- [ ] `app/dashboard/rankings/page.tsx`:
    - [ ] A Client Component or Server Component (with `preloadQuery`/`fetchQuery`) to orchestrate data fetching.
    - [ ] State: `sortBy` (e.g., "totalViews", "cpm"), `sortOrder` ("asc", "desc"), `selectedCampaignId`, `startDate`, `endDate`.
    - [ ] `useQuery(api.profiles.getInfluencerRankings, { ... })` to fetch data from Convex.
    - [ ] UI: Date range pickers, campaign selector, sort dropdowns.
    - [ ] Passes fetched data to `InfluencerRankingsTable` component.

### 6. Error Prevention
- [ ] **API errors:** Implement `try-catch` blocks in Convex functions for database operations and return meaningful error messages.
- [ ] **Validation:** Use `v` validators in Convex function arguments for `campaignId`, `startDate`, `endDate`, `sortBy`, `sortOrder`.
- [ ] **Rate limiting:** Implement basic rate limiting in Convex actions if publicly exposed (less critical for authenticated internal tools).
- [ ] **Auth:** Ensure all sensitive Convex queries and mutations are guarded by `ctx.auth.getUserIdentity()`.
- [ ] **Type safety:** Leverage Convex's generated types (`api`, `dataModel`) and TypeScript for end-to-end type safety in backend and frontend.
- [ ] **Boundaries:** Implement pagination for the ranking table if the number of influencers is expected to be very large to avoid overwhelming the client.

### 7. Testing
- [ ] **Unit tests:** Convex functions (aggregations, calculations, sorting logic).
- [ ] **Integration tests:** Data flow from frontend to Convex and back, including date range, campaign filtering, and sorting.
- [ ] **UI tests:** Display of ranking table, sorting functionality, animated transitions, highlighting of top performer.
- [ ] **Authentication tests:** Verify unauthorized access attempts are rejected.
- [ ] **Performance tests:** Evaluate query times with varying data sizes and complex filters.